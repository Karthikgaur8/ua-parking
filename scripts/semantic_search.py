"""
Semantic Search for Survey Comments

Usage:
    python scripts/semantic_search.py --themes artifacts/themes.json --query "cost concerns"

This script provides semantic search over survey text responses.
It embeds the query and finds the closest matching comments.
"""

import argparse
import json
import os
import sys
from pathlib import Path

import numpy as np
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if not GEMINI_API_KEY:
    print("Error: GEMINI_API_KEY not set")
    sys.exit(1)

import google.generativeai as genai

genai.configure(api_key=GEMINI_API_KEY)


def embed_query(query: str) -> np.ndarray:
    """Embed a search query."""
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=query,
        task_type="retrieval_query"
    )
    return np.array(result['embedding'])


def search_themes(themes: list[dict], query: str, top_k: int = 10) -> list[dict]:
    """
    Search through theme quotes for matches.

    Note: For production, we'd store embeddings in a vector DB.
    This is a simplified version that uses keyword matching + LLM reranking.
    """
    # Collect all quotes with metadata
    all_quotes = []
    for theme in themes:
        for quote in theme.get('quotes', []):
            all_quotes.append({
                'text': quote,
                'theme': theme['label'],
                'theme_id': theme['id'],
            })

    # Simple keyword matching first
    query_lower = query.lower()
    query_terms = query_lower.split()

    scored_quotes = []
    for item in all_quotes:
        text_lower = item['text'].lower()
        # Score by keyword matches
        score = sum(1 for term in query_terms if term in text_lower)
        if score > 0:
            scored_quotes.append({**item, 'score': score})

    # Sort by score
    scored_quotes.sort(key=lambda x: x['score'], reverse=True)

    return scored_quotes[:top_k]


def semantic_search(query: str, embeddings_path: Path, top_k: int = 10) -> list[dict]:
    """
    Full semantic search using stored embeddings.

    Requires embeddings to be pre-computed and stored.
    """
    if not embeddings_path.exists():
        print(f"Warning: Embeddings not found at {embeddings_path}")
        return []

    with open(embeddings_path) as f:
        data = json.load(f)

    query_embedding = embed_query(query)

    results = []
    for item in data.get('items', []):
        emb = np.array(item['embedding'])
        # Cosine similarity
        similarity = np.dot(query_embedding, emb) / (
            np.linalg.norm(query_embedding) * np.linalg.norm(emb)
        )
        results.append({
            'text': item['text'],
            'theme': item.get('theme', ''),
            'similarity': float(similarity),
        })

    results.sort(key=lambda x: x['similarity'], reverse=True)
    return results[:top_k]


def main():
    parser = argparse.ArgumentParser(description='Search survey comments')
    parser.add_argument('--themes', '-t', required=True, help='Path to themes.json')
    parser.add_argument('--query', '-q', required=True, help='Search query')
    parser.add_argument('--top', '-k', type=int, default=5, help='Number of results')
    args = parser.parse_args()

    themes_path = Path(args.themes)
    if not themes_path.exists():
        print(f"Error: Themes file not found: {themes_path}")
        sys.exit(1)

    with open(themes_path) as f:
        data = json.load(f)

    results = search_themes(data.get('themes', []), args.query, args.top)

    print(f"\n🔍 Search: \"{args.query}\"\n")
    print(f"Found {len(results)} matching quotes:\n")

    for i, result in enumerate(results, 1):
        print(f"{i}. [{result['theme']}]")
        print(f"   \"{result['text'][:100]}...\"")
        print()


if __name__ == '__main__':
    main()
