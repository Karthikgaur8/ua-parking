"""
LLM-Powered Thematic Analysis

Usage:
    python scripts/build_themes_llm.py -i data/clean.csv -o artifacts/themes.json

Instead of K-Means clustering on embeddings, this script sends ALL survey
comments to Gemini 2.5 Pro in a single prompt and asks it to perform
qualitative thematic analysis — the same way a human researcher would.

Output matches the same themes.json format used by the dashboard.
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

import pandas as pd

# Fix Windows terminal encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Load .env.local
script_dir = Path(__file__).parent.parent
env_file = script_dir / '.env.local'
if env_file.exists():
    try:
        content = env_file.read_text(encoding='utf-8-sig')
    except UnicodeDecodeError:
        content = env_file.read_text(encoding='utf-16')
    for line in content.strip().split('\n'):
        line = line.strip()
        if line and '=' in line and not line.startswith('#'):
            key, value = line.split('=', 1)
            os.environ[key.strip()] = value.strip()

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    print("Error: GEMINI_API_KEY not set in environment")
    sys.exit(1)

import requests


# ── Step 1: Load text data ──────────────────────────────────────────────

def load_text_data(csv_path: Path) -> pd.DataFrame:
    """Load survey texts from clean CSV."""
    print(f"Loading {csv_path}...")
    df = pd.read_csv(csv_path)

    # Get text from suggestion or skip_experience columns
    suggestion = df.get('suggestion', pd.Series(dtype=str)).fillna('').astype(str)
    experience = df.get('skip_experience', pd.Series(dtype=str)).fillna('').astype(str)

    # Prefer suggestion if long enough, else use experience
    use_suggestion = suggestion.str.len() > 15
    text = suggestion.where(use_suggestion, experience)

    # Only keep substantive responses
    mask = text.str.len() > 15

    result = pd.DataFrame({
        'id': df.get('id', pd.Series(range(len(df)))),
        'text': text,
        'arrival_time': df.get('arrival_time', pd.Series(dtype=str)),
        'mode': df.get('mode', pd.Series(dtype=str)),
        'skipped_class': df.get('skipped_class', pd.Series(dtype=bool)).fillna(False),
    })[mask].reset_index(drop=True)

    print(f"  Found {len(result)} substantive text responses")
    return result


# ── Step 2: LLM Thematic Analysis ───────────────────────────────────────

def call_gemini(prompt: str, model: str = "gemini-2.5-pro") -> str:
    """Call Gemini API and return text response."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        }
    }

    for attempt in range(3):
        try:
            resp = requests.post(url, json=payload, timeout=300)
            if resp.status_code == 200:
                data = resp.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
            elif resp.status_code == 429:
                delay = 2 ** (attempt + 1)
                print(f"  Rate limited, waiting {delay}s...")
                time.sleep(delay)
            else:
                print(f"  API error {resp.status_code}: {resp.text[:300]}")
                if attempt == 2:
                    raise Exception(f"API failed after 3 attempts: {resp.status_code}")
                time.sleep(2)
        except requests.exceptions.Timeout:
            print(f"  Timeout on attempt {attempt+1}/3, retrying...")
            time.sleep(5)

    raise Exception("All API attempts failed")


def analyze_themes(texts: list[str]) -> dict:
    """Send ALL texts to Gemini 2.5 Pro for full thematic analysis."""

    # Format texts as numbered list
    numbered_texts = "\n".join(f"{i+1}. {t.strip()}" for i, t in enumerate(texts))

    prompt = f"""You are a senior qualitative research analyst hired by a university's parking department.

Below are {len(texts)} free-text survey responses from students about their parking experience.
Your task: perform a rigorous thematic analysis and identify the key themes.

IMPORTANT RULES:
- Identify 5-8 distinct themes (not too few, not too many)
- Themes must be MUTUALLY DISTINCT — no overlapping concepts
- Each theme needs a short actionable label (2-4 words, like "Reduce Permit Costs" or "Closer Student Lots")
- For each theme, count how many comments relate to it (a comment can count in multiple themes)
- For each theme, pick the 5 most representative VERBATIM quotes — they must be EXACT text from the list below
- Also provide a 1-2 sentence insight/summary for each theme

Respond with this JSON schema:
{{
  "themes": [
    {{
      "label": "Theme Label",
      "description": "1-2 sentence insight about this theme",
      "count": 123,
      "quotes": ["exact quote 1", "exact quote 2", "exact quote 3", "exact quote 4", "exact quote 5"]
    }}
  ],
  "total_analyzed": {len(texts)}
}}

ORDER themes by count descending (most common first).

STUDENT RESPONSES:
{numbered_texts}"""

    print(f"\n  Sending {len(texts)} comments to Gemini 2.5 Pro...")
    print(f"  Estimated input: ~{len(prompt) // 4} tokens")
    start = time.time()

    response_text = call_gemini(prompt, model="gemini-2.5-pro")
    elapsed = time.time() - start
    print(f"  LLM analysis completed in {elapsed:.1f}s")

    # Parse JSON response
    try:
        result = json.loads(response_text)
    except json.JSONDecodeError:
        # Try to extract JSON from markdown code block
        if "```json" in response_text:
            json_str = response_text.split("```json")[1].split("```")[0].strip()
            result = json.loads(json_str)
        elif "```" in response_text:
            json_str = response_text.split("```")[1].split("```")[0].strip()
            result = json.loads(json_str)
        else:
            print(f"  Failed to parse response as JSON. Raw response:")
            print(response_text[:500])
            raise

    return result


# ── Step 3: Tag comments for segment breakdown ──────────────────────────

def tag_comments_batch(texts: list[str], theme_labels: list[str], batch_size: int = 200) -> list[str]:
    """Tag each comment with its PRIMARY theme using Gemini Flash (fast+cheap)."""
    print(f"\n  Tagging {len(texts)} comments with primary theme (for segment breakdowns)...")

    labels_str = "\n".join(f"  {i+1}. {label}" for i, label in enumerate(theme_labels))
    all_tags = []

    total_batches = (len(texts) - 1) // batch_size + 1
    for batch_idx in range(0, len(texts), batch_size):
        batch = texts[batch_idx:batch_idx + batch_size]
        batch_num = batch_idx // batch_size + 1
        print(f"  Tagging batch {batch_num}/{total_batches} ({len(batch)} texts)")

        numbered = "\n".join(f"{i+1}. {t.strip()}" for i, t in enumerate(batch))

        prompt = f"""For each comment below, reply with ONLY the number of its best-matching theme.

Themes:
{labels_str}

Comments:
{numbered}

Reply with {len(batch)} lines, each containing ONLY a theme number (1-{len(theme_labels)}). No other text."""

        try:
            response = call_gemini(prompt, model="gemini-2.5-flash")
            # Parse structured JSON response
            try:
                data = json.loads(response)
                # Handle various JSON formats the model might return
                if isinstance(data, list):
                    nums = data
                elif isinstance(data, dict) and 'tags' in data:
                    nums = data['tags']
                else:
                    nums = list(data.values()) if isinstance(data, dict) else []
            except (json.JSONDecodeError, TypeError):
                # Fallback: parse as newline-separated numbers
                lines = response.strip().split('\n')
                nums = []
                for line in lines:
                    clean = ''.join(c for c in line if c.isdigit())
                    if clean:
                        nums.append(int(clean))

            for num in nums:
                idx = int(num) - 1
                if 0 <= idx < len(theme_labels):
                    all_tags.append(theme_labels[idx])
                else:
                    all_tags.append(theme_labels[0])  # fallback
        except Exception as e:
            print(f"    Batch tagging failed: {e}, using first theme as default")
            all_tags.extend([theme_labels[0]] * len(batch))

        time.sleep(0.2)

    return all_tags[:len(texts)]


# ── Step 4: Build output JSON ───────────────────────────────────────────

def build_output(llm_result: dict, df: pd.DataFrame, tags: list[str], input_file: str) -> dict:
    """Build the themes.json output with segment breakdowns."""
    themes = []

    # Add primary_theme column to df for segment computation
    df = df.copy()
    df['primary_theme'] = tags[:len(df)]

    for i, theme in enumerate(llm_result.get('themes', [])):
        label = theme['label']

        # Get segment data for comments tagged with this theme
        theme_df = df[df['primary_theme'] == label]

        if len(theme_df) == 0:
            # Fallback: use all data proportionally
            theme_df = df.sample(min(50, len(df)))

        segments = {
            'by_arrival_time': theme_df['arrival_time'].value_counts().to_dict() if 'arrival_time' in theme_df else {},
            'by_mode': theme_df['mode'].value_counts().to_dict() if 'mode' in theme_df else {},
            'skip_rate': float(theme_df['skipped_class'].mean()) if 'skipped_class' in theme_df else None,
        }

        themes.append({
            'id': i,
            'label': label,
            'description': theme.get('description', ''),
            'count': theme.get('count', len(theme_df)),
            'pct': round(theme.get('count', len(theme_df)) / len(df) * 100, 1),
            'quotes': theme.get('quotes', [])[:5],
            'segments': segments,
        })

    return {
        'metadata': {
            'generated_at': datetime.now().isoformat(),
            'input_file': input_file,
            'total_texts': len(df),
            'n_clusters': len(themes),
            'method': 'llm_thematic_analysis',
            'model': 'gemini-2.5-pro',
        },
        'themes': themes,
    }


# ── Main ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='LLM-powered thematic analysis')
    parser.add_argument('--input', '-i', required=True, help='Path to clean CSV')
    parser.add_argument('--output', '-o', required=True, help='Output path for themes.json')
    args = parser.parse_args()

    total_start = time.time()

    # Load data
    df = load_text_data(Path(args.input))
    texts = df['text'].tolist()

    # Phase 1: Full LLM analysis
    llm_result = analyze_themes(texts)
    theme_labels = [t['label'] for t in llm_result.get('themes', [])]

    print(f"\n  Found {len(theme_labels)} themes:")
    for t in llm_result.get('themes', []):
        print(f"    {t['label']}: {t.get('count', '?')} comments")

    # Phase 2: Tag each comment for segment breakdowns
    tags = tag_comments_batch(texts, theme_labels)

    # Phase 3: Build and save output
    output = build_output(llm_result, df, tags, args.input)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2, default=str)

    total_elapsed = time.time() - total_start
    print(f"\n{'='*50}")
    print(f"  Saved themes to {output_path}")
    print(f"  Total time: {total_elapsed:.1f}s")
    print(f"{'='*50}")

    print(f"\n  Theme Summary:")
    for t in output['themes']:
        print(f"    {t['label']}: {t['count']} ({t['pct']}%)")


if __name__ == '__main__':
    main()
