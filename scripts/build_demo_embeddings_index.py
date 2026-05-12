"""
Regenerate the public demo embedding index with Gemini embeddings.

This script is intentionally limited to synthetic demo data already committed in
artifacts/embeddings_index.json. It does not read data/clean.csv or data/raw/.

Usage:
    python scripts/build_demo_embeddings_index.py
"""

from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import google.generativeai as genai


ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "artifacts" / "embeddings_index.json"
ENV_PATH = ROOT / ".env.local"
MODEL = "models/gemini-embedding-001"
EMBEDDING_DIMENSION = 768
BATCH_SIZE = 16


def load_env() -> None:
    if not ENV_PATH.exists():
        return

    try:
        content = ENV_PATH.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        content = ENV_PATH.read_text(encoding="utf-16")

    for line in content.splitlines():
        line = line.strip().lstrip("\ufeff")
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def embed_batch(texts: list[str]) -> list[list[float]]:
    result = genai.embed_content(
        model=MODEL,
        content=texts,
        task_type="retrieval_document",
        output_dimensionality=EMBEDDING_DIMENSION,
    )
    embeddings = result["embedding"]
    if not embeddings:
        raise RuntimeError("Gemini returned no embeddings")
    if isinstance(embeddings[0], float):
        return [embeddings]
    return embeddings


def main() -> None:
    load_env()
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not found. Add it to .env.local or the environment.")

    genai.configure(api_key=api_key)

    index = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
    if index.get("metadata", {}).get("demo_data") is not True:
        raise RuntimeError("Refusing to rebuild non-demo embedding index")

    documents = index.get("documents", [])
    if not documents:
        raise RuntimeError("No documents found in demo embedding index")

    if any(not str(doc.get("text", "")).startswith("Synthetic example:") for doc in documents):
        raise RuntimeError("Refusing to embed documents that are not marked as synthetic examples")

    print(f"Embedding {len(documents)} synthetic demo documents with {MODEL}...")

    for start in range(0, len(documents), BATCH_SIZE):
        batch = documents[start:start + BATCH_SIZE]
        texts = [doc["text"] for doc in batch]
        for attempt in range(4):
            try:
                vectors = embed_batch(texts)
                if len(vectors) != len(batch):
                    raise RuntimeError(f"Expected {len(batch)} embeddings, got {len(vectors)}")
                for doc, vector in zip(batch, vectors):
                    doc["embedding"] = [round(float(value), 8) for value in vector]
                break
            except Exception:
                if attempt == 3:
                    raise
                delay = 2**attempt
                print(f"  Retry batch {start // BATCH_SIZE + 1} in {delay}s...")
                time.sleep(delay)

    index["metadata"].update({
        "requested_model": MODEL,
        "model": MODEL,
        "embedding_dim": len(documents[0]["embedding"]),
        "embedding_source": "gemini_api",
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "demo_data": True,
    })

    INDEX_PATH.write_text(json.dumps(index, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(documents)} Gemini-embedded synthetic documents to {INDEX_PATH}")


if __name__ == "__main__":
    main()
