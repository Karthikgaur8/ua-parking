"""
Build the semantic quote index for the chat endpoint.

Usage:
    python scripts/build_embeddings_index.py

The index is built from data/clean.csv using only these free-text columns:
- suggestion
- skip_experience
- ada_improvement

Each document stores quote text, source column, row id, and an embedding vector.
"""

import json
import os
import time
from pathlib import Path

import pandas as pd

# Load environment variables (handle Windows encoding issues)
script_dir = Path(__file__).parent.parent
env_file = script_dir / ".env.local"
if env_file.exists():
    try:
        content = env_file.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        content = env_file.read_text(encoding="utf-16")
    for line in content.strip().split("\n"):
        line = line.strip().lstrip("\ufeff")
        if line and "=" in line and not line.startswith("#"):
            key, value = line.split("=", 1)
            os.environ[key.strip()] = value.strip()

import google.generativeai as genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment")

genai.configure(api_key=GEMINI_API_KEY)

TEXT_COLUMNS = ("suggestion", "skip_experience", "ada_improvement")
MIN_TEXT_LENGTH = 10
BATCH_SIZE = 100
EMBEDDING_DIMENSION = 768

# Prefer the requested legacy model, but fall back to the currently available
# Gemini embedding model when the API no longer exposes text-embedding-004.
EMBEDDING_MODEL_CANDIDATES = (
    "models/text-embedding-004",
    "models/gemini-embedding-001",
)


def clean_text(value) -> str:
    """Return a clean string or an empty string for missing survey text."""
    if pd.isna(value):
        return ""
    text = str(value).strip()
    if text.lower() in {"nan", "na", "n/a", ""}:
        return ""
    return text


def load_documents(csv_path: Path) -> list[dict]:
    """Load quote documents with row id and source column metadata."""
    print(f"Loading {csv_path}...")
    try:
        df = pd.read_csv(csv_path, encoding="utf-8")
    except UnicodeDecodeError:
        df = pd.read_csv(csv_path, encoding="latin-1")

    missing = [col for col in TEXT_COLUMNS if col not in df.columns]
    if missing:
        raise ValueError(f"Missing expected text columns: {', '.join(missing)}")

    documents = []
    for row_id, row in df.iterrows():
        for source_column in TEXT_COLUMNS:
            text = clean_text(row.get(source_column))
            if len(text) <= MIN_TEXT_LENGTH:
                continue
            documents.append({
                "id": f"{source_column}_{row_id}",
                "row_id": int(row_id),
                "source_column": source_column,
                "text": text,
            })

    print(f"  Found {len(documents)} quote documents")
    return documents


def embed_batch(model: str, contents: list[str]) -> list[list[float]]:
    """Embed a batch and return one vector per input string."""
    result = genai.embed_content(
        model=model,
        content=contents,
        task_type="retrieval_document",
        output_dimensionality=EMBEDDING_DIMENSION,
    )
    embeddings = result["embedding"]
    if not embeddings:
        raise RuntimeError("Embedding API returned no vectors")
    if isinstance(embeddings[0], float):
        return [embeddings]
    return embeddings


def select_embedding_model(sample_text: str) -> str:
    """Pick the first configured embedding model supported by the active API key."""
    last_error = None
    for model in EMBEDDING_MODEL_CANDIDATES:
        try:
            embed_batch(model, [sample_text])
            return model
        except Exception as exc:
            last_error = exc
            print(f"  Model unavailable: {model} ({type(exc).__name__})")
    raise RuntimeError("No configured embedding model is available") from last_error


def embed_documents(
    documents: list[dict],
    batch_size: int = BATCH_SIZE,
) -> tuple[list[dict], str]:
    """Embed all documents and add embedding vectors."""
    if not documents:
        return documents, EMBEDDING_MODEL_CANDIDATES[0]

    model = select_embedding_model(documents[0]["text"])
    print(f"Embedding {len(documents)} documents with {model}...")
    n_batches = (len(documents) + batch_size - 1) // batch_size

    for i in range(0, len(documents), batch_size):
        batch_num = i // batch_size + 1
        batch = documents[i:i + batch_size]
        print(f"  Batch {batch_num}/{n_batches}")

        max_retries = 4
        for attempt in range(max_retries):
            try:
                vectors = embed_batch(model, [doc["text"] for doc in batch])
                if len(vectors) != len(batch):
                    raise RuntimeError(f"Expected {len(batch)} embeddings, got {len(vectors)}")
                for doc, vector in zip(batch, vectors):
                    doc["embedding"] = [round(float(v), 8) for v in vector]
                break
            except Exception as exc:
                if attempt == max_retries - 1:
                    raise
                error_msg = str(exc).lower()
                if "rate" in error_msg or "quota" in error_msg or "429" in error_msg:
                    delay = 2.0 * (2 ** attempt)
                else:
                    delay = 1.0 * (attempt + 1)
                print(f"    Embedding error ({type(exc).__name__}), retrying in {delay}s...")
                time.sleep(delay)

    return documents, model


def save_index(documents: list[dict], output_path: Path, model: str):
    """Save embeddings index to JSON."""
    print(f"Saving to {output_path}...")
    embedding_dim = len(documents[0]["embedding"]) if documents else 0

    index = {
        "metadata": {
            "total_documents": len(documents),
            "total_texts": len(documents),
            "source_file": "data/clean.csv",
            "source_columns": list(TEXT_COLUMNS),
            "requested_model": EMBEDDING_MODEL_CANDIDATES[0],
            "model": model,
            "embedding_dim": embedding_dim,
            "generated_at": pd.Timestamp.now().isoformat(),
        },
        "documents": documents,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(index, f, separators=(",", ":"))

    print(f"Saved {len(documents)} documents with {embedding_dim}-dimensional embeddings")


def main():
    csv_path = script_dir / "data" / "clean.csv"
    output_path = script_dir / "artifacts" / "embeddings_index.json"

    if not csv_path.exists():
        raise FileNotFoundError(f"Data file not found: {csv_path}")

    documents = load_documents(csv_path)
    documents, model = embed_documents(documents)
    save_index(documents, output_path, model)


if __name__ == "__main__":
    main()
