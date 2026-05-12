"""
Create Simplified Embeddings Index from Themes

This uses the quotes from themes.json rather than re-embedding everything.
A simpler approach that doesn't require the embedding API.
"""

import json
from pathlib import Path
import hashlib

def create_simple_index():
    """Create a simple document index from themes.json quotes."""
    script_dir = Path(__file__).parent.parent
    themes_path = script_dir / 'artifacts' / 'themes.json'
    output_path = script_dir / 'artifacts' / 'simple_index.json'

    if not themes_path.exists():
        raise FileNotFoundError(f"themes.json not found at {themes_path}")

    with open(themes_path, 'r', encoding='utf-8') as f:
        themes_data = json.load(f)

    # Extract all quotes from themes
    documents = []
    for theme in themes_data['themes']:
        for i, quote in enumerate(theme['quotes']):
            documents.append({
                'id': f"{theme['id']}_{i}",
                'text': quote,
                'theme_label': theme['label'],
                'theme_id': theme['id'],
            })

    index = {
        'metadata': {
            'total_documents': len(documents),
            'source': 'themes.json quotes',
        },
        'documents': documents
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(index, f, indent=2)

    print(f"✅ Created simple index with {len(documents)} quotes")
    return output_path

if __name__ == '__main__':
    create_simple_index()
