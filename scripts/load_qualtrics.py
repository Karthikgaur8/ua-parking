"""
Qualtrics Survey Ingestion Pipeline

Usage:
    python scripts/load_qualtrics.py --input data/raw/survey.xlsx --output data/clean.csv

This script:
1. Loads Qualtrics XLSX export
2. Drops PII columns (emails, IPs, locations, names)
3. Filters out preview responses
4. Normalizes column names
5. Validates no PII remains in text fields
6. Outputs clean.csv
"""

import argparse
import re
import sys
from pathlib import Path

import pandas as pd

# Fix Windows terminal encoding for emoji/Unicode
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')


# PII columns to drop completely
PII_COLUMNS = [
    'Q1 A',  # Crimson email
    'IPAddress',
    'LocationLatitude',
    'LocationLongitude',
    'RecipientEmail',
    'RecipientFirstName',
    'RecipientLastName',
    'ExternalReference',
    'RecipientEmail',
]

# Column rename mapping (Qualtrics -> clean names)
COLUMN_RENAME = {
    'ResponseId': 'id',
    'StartDate': 'started_at',
    'EndDate': 'ended_at',
    'Status': 'status',
    'Progress': 'progress',
    'Duration (in seconds)': 'duration_seconds',
    'Finished': 'finished',
    'RecordedDate': 'recorded_at',
    'DistributionChannel': 'distribution_channel',
    'UserLanguage': 'language',
    'Q_RecaptchaScore': 'recaptcha_score',
    'Q1 B': 'mode',
    'Q2': 'frequency',
    'Q3': 'ease',
    'Q4': 'arrival_time',
    'Q5 A_1': 'rank_spots',
    'Q5 A_2': 'rank_distance',
    'Q5 A_3': 'rank_cost',
    'Q5 A_4': 'rank_security',
    'Q5 A_5': 'rank_navigation',
    'Q5 A_6': 'rank_other',
    'Q5 B': 'rank_other_text',
    'Q6': 'minutes_searching',
    'Q7 A': 'skipped_class',
    'Q7 B': 'skip_experience',
    'Q8': 'pay_to_park_sentiment',
    'Q9': 'crimson_ride_aware',
    'Q10': 'crimson_ride_willing',
    'Q11': 'suggestion',
    'Q12': 'ada_opted_in',
    'Q13': 'ada_satisfaction',
    'Q14': 'ada_adequate',
    'Q15': 'ada_improvement',
    'Q11 - Topics': 'suggestion_topics',
    'Q11 - Parent Topics': 'suggestion_parent_topics',
    'Q11 - Topic Hierarchy Level 1': 'suggestion_topic_level1',
}

# Text columns to scan for PII
TEXT_COLUMNS = ['skip_experience', 'suggestion', 'rank_other_text', 'ada_improvement']

# Email regex pattern
EMAIL_PATTERN = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')

# Phone regex pattern
PHONE_PATTERN = re.compile(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b')


def load_qualtrics(file_path: Path) -> pd.DataFrame:
    """Load Qualtrics export (XLSX or CSV) and clean header rows."""
    print(f"Loading {file_path}...")

    suffix = file_path.suffix.lower()
    if suffix == '.csv':
        df = pd.read_csv(file_path, encoding='utf-8')
    elif suffix in ('.xlsx', '.xls'):
        df = pd.read_excel(file_path)
    else:
        print(f"  Warning: Unknown extension '{suffix}', trying CSV...")
        df = pd.read_csv(file_path, encoding='utf-8')

    # Qualtrics exports have 2 metadata header rows (question text + import IDs)
    # Row 0 = column names (already used by pandas), rows 1-2 = metadata → drop
    if len(df) > 2:
        df = df.iloc[2:].copy()
        df = df.reset_index(drop=True)

    print(f"  Loaded {len(df)} rows (after dropping header rows)")
    return df


def drop_pii_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Remove PII columns."""
    cols_to_drop = [c for c in PII_COLUMNS if c in df.columns]
    df = df.drop(columns=cols_to_drop)
    print(f"  Dropped {len(cols_to_drop)} PII columns: {cols_to_drop}")
    return df


def filter_previews(df: pd.DataFrame) -> pd.DataFrame:
    """Remove survey preview responses."""
    before = len(df)
    df = df[df['Status'] != 'Survey Preview'].copy()
    after = len(df)
    print(f"  Filtered {before - after} preview responses, {after} remain")
    return df


def rename_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Rename columns to clean names."""
    df = df.rename(columns=COLUMN_RENAME)
    return df


def anonymize_text(text: str) -> str:
    """Remove PII patterns from text."""
    if pd.isna(text):
        return text
    text = str(text)
    text = EMAIL_PATTERN.sub('[EMAIL]', text)
    text = PHONE_PATTERN.sub('[PHONE]', text)
    return text


def anonymize_text_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Anonymize all text columns."""
    for col in TEXT_COLUMNS:
        if col in df.columns:
            df[col] = df[col].apply(anonymize_text)
    print(f"  Anonymized text columns: {TEXT_COLUMNS}")
    return df


def validate_no_pii(df: pd.DataFrame) -> bool:
    """Validate no PII patterns remain in text columns."""
    issues = []
    for col in TEXT_COLUMNS:
        if col not in df.columns:
            continue
        for idx, val in df[col].items():
            if pd.isna(val):
                continue
            val = str(val)
            if EMAIL_PATTERN.search(val):
                issues.append(f"Email found in {col}, row {idx}")

    if issues:
        print(f"  ❌ PII validation failed:")
        for issue in issues[:5]:
            print(f"    - {issue}")
        return False

    print(f"  ✅ PII validation passed")
    return True


def normalize_booleans(df: pd.DataFrame) -> pd.DataFrame:
    """Convert Yes/No and True/False to booleans."""
    bool_columns = ['finished', 'skipped_class', 'crimson_ride_aware',
                    'crimson_ride_willing', 'ada_opted_in']

    for col in bool_columns:
        if col in df.columns:
            df[col] = df[col].map({
                'Yes': True, 'No': False,
                'True': True, 'False': False,
                True: True, False: False
            })
    return df


def main():
    parser = argparse.ArgumentParser(description='Load and clean Qualtrics survey export')
    parser.add_argument('--input', '-i', required=True, help='Path to Qualtrics XLSX file')
    parser.add_argument('--output', '-o', required=True, help='Path to output clean.csv')
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}")
        sys.exit(1)

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Pipeline
    df = load_qualtrics(input_path)
    df = drop_pii_columns(df)
    df = filter_previews(df)
    df = rename_columns(df)
    df = anonymize_text_columns(df)
    df = normalize_booleans(df)

    if not validate_no_pii(df):
        print("Error: PII validation failed. Aborting.")
        sys.exit(1)

    # Save
    df.to_csv(output_path, index=False)
    print(f"\n✅ Saved clean data to {output_path}")
    print(f"   Total rows: {len(df)}")
    print(f"   Columns: {len(df.columns)}")

    # Summary stats
    finished = df['finished'].sum() if 'finished' in df.columns else 'N/A'
    print(f"   Completed responses: {finished}")


if __name__ == '__main__':
    main()
