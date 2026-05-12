"""
Qualtrics API Response Fetcher

Usage:
    python scripts/fetch_qualtrics_api.py
    python scripts/fetch_qualtrics_api.py --output data/raw/survey_api.csv

Requires in .env.local:
    QUALTRICS_API_TOKEN=xxx
    QUALTRICS_DATACENTER=xxx
    QUALTRICS_SURVEY_ID=SV_xxx

This script:
1. Creates an export job via Qualtrics API
2. Polls until export is complete
3. Downloads the ZIP, extracts the CSV
4. Saves to data/raw/survey_api.csv
"""

import argparse
import io
import os
import sys
import time
import zipfile
from pathlib import Path

import requests

# Fix Windows terminal encoding for emoji/Unicode
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
            os.environ.setdefault(key.strip(), value.strip())


def get_config():
    """Read Qualtrics config from environment."""
    token = os.getenv('QUALTRICS_API_TOKEN')
    datacenter = os.getenv('QUALTRICS_DATACENTER')
    survey_id = os.getenv('QUALTRICS_SURVEY_ID')

    missing = []
    if not token:
        missing.append('QUALTRICS_API_TOKEN')
    if not datacenter:
        missing.append('QUALTRICS_DATACENTER')
    if not survey_id:
        missing.append('QUALTRICS_SURVEY_ID')

    if missing:
        print(f"❌ Missing environment variables: {', '.join(missing)}")
        print(f"   Add them to .env.local or set as environment variables.")
        sys.exit(1)

    return token, datacenter, survey_id


def create_export(token: str, datacenter: str, survey_id: str) -> str:
    """Step 1: Create a response export job. Returns progressId."""
    url = f"https://{datacenter}.qualtrics.com/API/v3/surveys/{survey_id}/export-responses"
    headers = {
        "X-API-TOKEN": token,
        "Content-Type": "application/json",
    }
    payload = {
        "format": "csv",
        "compress": True,
        "useLabels": True,  # Export text labels instead of numeric codes
    }

    print(f"  Creating export job...")
    resp = requests.post(url, json=payload, headers=headers, timeout=30)

    if resp.status_code != 200:
        print(f"❌ Failed to create export: {resp.status_code}")
        print(f"   Response: {resp.text}")
        if resp.status_code == 401:
            print(f"   → Check your QUALTRICS_API_TOKEN in .env.local")
        elif resp.status_code == 404:
            print(f"   → Check your QUALTRICS_SURVEY_ID ({survey_id})")
        elif resp.status_code == 403:
            print(f"   → The API token may not have access to this survey")
        sys.exit(1)

    data = resp.json()
    progress_id = data["result"]["progressId"]
    print(f"  Export started (progressId: {progress_id})")
    return progress_id


def poll_export(token: str, datacenter: str, survey_id: str, progress_id: str) -> str:
    """Step 2: Poll until export completes. Returns fileId."""
    url = f"https://{datacenter}.qualtrics.com/API/v3/surveys/{survey_id}/export-responses/{progress_id}"
    headers = {"X-API-TOKEN": token}

    print(f"  Polling for completion", end="", flush=True)

    max_polls = 60  # 60 × 2s = 2 minutes max
    for attempt in range(max_polls):
        resp = requests.get(url, headers=headers, timeout=30)

        if resp.status_code != 200:
            print(f"\n❌ Poll failed: {resp.status_code} — {resp.text}")
            sys.exit(1)

        data = resp.json()
        status = data["result"]["status"]
        percent = data["result"].get("percentComplete", 0)

        if status == "complete":
            file_id = data["result"]["fileId"]
            print(f" ✅ Complete!")
            return file_id
        elif status == "failed":
            print(f"\n❌ Export failed on Qualtrics side")
            sys.exit(1)
        else:
            print(f".", end="", flush=True)
            time.sleep(2)

    print(f"\n❌ Timed out waiting for export (>{max_polls * 2}s)")
    sys.exit(1)


def download_export(token: str, datacenter: str, survey_id: str, file_id: str, output_path: Path) -> int:
    """Step 3: Download the ZIP, extract CSV, save to output_path."""
    url = f"https://{datacenter}.qualtrics.com/API/v3/surveys/{survey_id}/export-responses/{file_id}/file"
    headers = {"X-API-TOKEN": token}

    print(f"  Downloading export...")
    resp = requests.get(url, headers=headers, timeout=120, stream=True)

    if resp.status_code != 200:
        print(f"❌ Download failed: {resp.status_code} — {resp.text}")
        sys.exit(1)

    # The response is a ZIP file containing a single CSV
    zip_bytes = io.BytesIO(resp.content)

    with zipfile.ZipFile(zip_bytes) as zf:
        csv_files = [f for f in zf.namelist() if f.endswith('.csv')]
        if not csv_files:
            print(f"❌ No CSV found in export ZIP. Contents: {zf.namelist()}")
            sys.exit(1)

        csv_name = csv_files[0]
        print(f"  Extracting: {csv_name}")

        # Read CSV content and save
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with zf.open(csv_name) as csv_file:
            csv_content = csv_file.read()
            output_path.write_bytes(csv_content)

    # Count rows (subtract header rows)
    line_count = csv_content.decode('utf-8', errors='replace').count('\n') - 1
    return line_count


def main():
    parser = argparse.ArgumentParser(description='Fetch survey responses from Qualtrics API')
    parser.add_argument(
        '--output', '-o',
        default=str(script_dir / 'data' / 'raw' / 'survey_api.csv'),
        help='Output path for downloaded CSV'
    )
    args = parser.parse_args()
    output_path = Path(args.output)

    print(f"🔄 Qualtrics API Response Fetcher")
    print(f"{'='*50}")

    token, datacenter, survey_id = get_config()
    print(f"  Datacenter: {datacenter}")
    print(f"  Survey:     {survey_id}")
    print(f"  Output:     {output_path}\n")

    start = time.time()

    # 3-step export process
    progress_id = create_export(token, datacenter, survey_id)
    file_id = poll_export(token, datacenter, survey_id, progress_id)
    row_count = download_export(token, datacenter, survey_id, file_id, output_path)

    elapsed = time.time() - start
    print(f"\n{'='*50}")
    print(f"✅ Downloaded ~{row_count} responses in {elapsed:.1f}s")
    print(f"   Saved to: {output_path}")
    print(f"\n  Next: python scripts/refresh_data.py --input \"{output_path}\"")


if __name__ == '__main__':
    main()
