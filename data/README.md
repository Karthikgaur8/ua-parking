# Data Directory

This directory contains survey data files.

## Structure

- `raw/` - Raw Qualtrics exports (gitignored)
- `clean.csv` - PII-scrubbed data (gitignored by default)

## Usage

1. Place your Qualtrics XLSX export in `data/raw/`
2. Run the ingestion pipeline:
   ```bash
   python scripts/load_qualtrics.py --input data/raw/survey.xlsx --output data/clean.csv
   ```

## Important

- **Never commit raw survey files** - they contain PII
- **clean.csv is gitignored** - only commit if explicitly verified PII-free
