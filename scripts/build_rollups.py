"""
Build Metrics and Theme Rollups

Usage:
    python scripts/build_rollups.py --input data/clean.csv --output artifacts/

This script:
1. Loads cleaned survey data
2. Computes all metrics with n/N denominators
3. Computes weighted priority scores for rankings
4. Computes Parking Friction Score (PFS) by segment
5. Outputs JSON artifacts
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# Fix Windows terminal encoding for emoji/Unicode
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')


def compute_pfs(ease: str, minutes: float, skipped: bool) -> float:
    """
    Parking Friction Score (PFS)

    PFS = 0.35 * difficulty_score + 0.35 * minutes_norm + 0.30 * skip_score

    Range: 0.0 (no friction) to 1.0 (max friction)
    """
    difficulty_map = {
        "Very Easy": 0.0, "Easy": 0.25, "Neutral": 0.50,
        "Difficult": 0.75, "Very Difficult": 1.0
    }
    difficulty_score = difficulty_map.get(ease, 0.5)

    # Normalize minutes (0-45 range clamped)
    if pd.isna(minutes):
        minutes_norm = 0.5  # default if missing
    else:
        minutes_norm = min(float(minutes) / 45.0, 1.0)

    # Skip: binary
    skip_score = 1.0 if skipped else 0.0

    return 0.35 * difficulty_score + 0.35 * minutes_norm + 0.30 * skip_score


def compute_metrics(df: pd.DataFrame) -> dict:
    """Compute all metrics with n/N denominators."""
    metrics = {}

    # Total responses
    total = len(df)
    completed = df['finished'].sum() if 'finished' in df.columns else total
    metrics['total_responses'] = {'n': total, 'completed': int(completed)}

    # Mode distribution
    if 'mode' in df.columns:
        mode_counts = df['mode'].value_counts().to_dict()
        mode_total = df['mode'].notna().sum()
        metrics['mode_distribution'] = {
            'counts': mode_counts,
            'total': int(mode_total)
        }

    # Frequency distribution
    if 'frequency' in df.columns:
        freq_counts = df['frequency'].value_counts().to_dict()
        freq_total = df['frequency'].notna().sum()
        metrics['frequency_distribution'] = {
            'counts': freq_counts,
            'total': int(freq_total)
        }

    # Ease distribution
    if 'ease' in df.columns:
        ease_counts = df['ease'].value_counts().to_dict()
        ease_total = df['ease'].notna().sum()

        # Compute difficulty rate
        difficult = ease_counts.get('Difficult', 0) + ease_counts.get('Very Difficult', 0)

        metrics['ease_distribution'] = {
            'counts': ease_counts,
            'total': int(ease_total),
            'difficult_rate': {
                'n': int(difficult),
                'N': int(ease_total),
                'pct': round(difficult / ease_total * 100, 1) if ease_total > 0 else 0
            }
        }

    # Arrival time distribution
    if 'arrival_time' in df.columns:
        arrival_counts = df['arrival_time'].value_counts().to_dict()
        arrival_total = df['arrival_time'].notna().sum()
        metrics['arrival_distribution'] = {
            'counts': arrival_counts,
            'total': int(arrival_total)
        }

    # Skip rate
    if 'skipped_class' in df.columns:
        skipped = df['skipped_class'].sum()
        skip_total = df['skipped_class'].notna().sum()
        metrics['skip_rate'] = {
            'n': int(skipped),
            'N': int(skip_total),
            'pct': round(skipped / skip_total * 100, 1) if skip_total > 0 else 0
        }

    # Minutes searching stats
    if 'minutes_searching' in df.columns:
        minutes = pd.to_numeric(df['minutes_searching'], errors='coerce')
        valid_minutes = minutes.dropna()
        metrics['minutes_searching'] = {
            'mean': round(valid_minutes.mean(), 1) if len(valid_minutes) > 0 else None,
            'median': round(valid_minutes.median(), 1) if len(valid_minutes) > 0 else None,
            'min': round(valid_minutes.min(), 1) if len(valid_minutes) > 0 else None,
            'max': round(valid_minutes.max(), 1) if len(valid_minutes) > 0 else None,
            'n': int(len(valid_minutes))
        }

    # Pay-to-park sentiment
    if 'pay_to_park_sentiment' in df.columns:
        ptp_counts = df['pay_to_park_sentiment'].value_counts().to_dict()
        ptp_total = df['pay_to_park_sentiment'].notna().sum()
        metrics['pay_to_park_sentiment'] = {
            'counts': ptp_counts,
            'total': int(ptp_total)
        }

    # Crimson Ride awareness and willingness
    if 'crimson_ride_aware' in df.columns:
        aware = df['crimson_ride_aware'].sum()
        aware_total = df['crimson_ride_aware'].notna().sum()
        metrics['crimson_ride_awareness'] = {
            'n': int(aware),
            'N': int(aware_total),
            'pct': round(aware / aware_total * 100, 1) if aware_total > 0 else 0
        }

    if 'crimson_ride_willing' in df.columns:
        willing = df['crimson_ride_willing'].sum()
        willing_total = df['crimson_ride_willing'].notna().sum()
        metrics['crimson_ride_willingness'] = {
            'n': int(willing),
            'N': int(willing_total),
            'pct': round(willing / willing_total * 100, 1) if willing_total > 0 else 0
        }

    return metrics


def compute_rankings(df: pd.DataFrame) -> dict:
    """Compute weighted priority scores for challenge rankings."""
    ranking_cols = {
        'rank_spots': 'Too few spots',
        'rank_distance': 'Distance from classes',
        'rank_cost': 'High cost',
        'rank_security': 'Security concerns',
        'rank_navigation': 'Poor navigation',
        'rank_other': 'Other'
    }

    rankings = {}

    for col, label in ranking_cols.items():
        if col not in df.columns:
            continue

        # Clean and get rank counts
        ranks = pd.to_numeric(df[col], errors='coerce').dropna()
        rank_counts = ranks.value_counts().to_dict()

        # Count how many ranked this in top 3
        top3_count = sum(rank_counts.get(r, 0) for r in [1, 2, 3])
        total_ranked = len(ranks)

        # Weighted priority score: 3*rank1 + 2*rank2 + 1*rank3
        weighted_score = (
            3 * rank_counts.get(1, 0) +
            2 * rank_counts.get(2, 0) +
            1 * rank_counts.get(3, 0)
        )

        rankings[label] = {
            'rank_counts': {int(k): int(v) for k, v in rank_counts.items()},
            'weighted_score': int(weighted_score),
            'top3_count': int(top3_count),
            'top3_pct': round(top3_count / total_ranked * 100, 1) if total_ranked > 0 else 0,
            'total_ranked': int(total_ranked)
        }

    # Sort by weighted score
    rankings = dict(sorted(rankings.items(), key=lambda x: x[1]['weighted_score'], reverse=True))

    return rankings


def compute_segments(df: pd.DataFrame) -> dict:
    """Compute PFS and skip rate by segment."""
    segments = {}

    # First, compute PFS for each response
    # Vectorized PFS computation (no row-by-row .apply)
    df = df.copy()
    difficulty_map = {
        "Very Easy": 0.0, "Easy": 0.25, "Neutral": 0.50,
        "Difficult": 0.75, "Very Difficult": 1.0
    }
    df['_diff_score'] = df['ease'].map(difficulty_map).fillna(0.5)
    df['_minutes_norm'] = np.clip(
        pd.to_numeric(df['minutes_searching'], errors='coerce').fillna(22.5) / 45.0,
        0.0, 1.0
    )
    df['_skip_score'] = df['skipped_class'].fillna(False).astype(float)
    df['pfs'] = 0.35 * df['_diff_score'] + 0.35 * df['_minutes_norm'] + 0.30 * df['_skip_score']

    # By arrival time
    if 'arrival_time' in df.columns:
        arrival_segments = {}
        for arrival, group in df.groupby('arrival_time'):
            if pd.isna(arrival):
                continue
            skip_col = group['skipped_class'].fillna(False) if 'skipped_class' in group else pd.Series(dtype=float)
            minutes_col = pd.to_numeric(group['minutes_searching'], errors='coerce')
            arrival_segments[arrival] = {
                'n': int(len(group)),
                'avg_pfs': round(group['pfs'].mean(), 3),
                'skip_rate': round(skip_col.mean() * 100, 1) if len(skip_col) > 0 else None,
                'avg_minutes': round(minutes_col.mean(), 1) if minutes_col.notna().any() else None
            }
        segments['by_arrival_time'] = arrival_segments

    # By mode
    if 'mode' in df.columns:
        mode_segments = {}
        for mode, group in df.groupby('mode'):
            if pd.isna(mode):
                continue
            skip_col = group['skipped_class'].fillna(False) if 'skipped_class' in group else pd.Series(dtype=float)
            mode_segments[mode] = {
                'n': int(len(group)),
                'avg_pfs': round(group['pfs'].mean(), 3),
                'skip_rate': round(skip_col.mean() * 100, 1) if len(skip_col) > 0 else None
            }
        segments['by_mode'] = mode_segments

    # By frequency
    if 'frequency' in df.columns:
        freq_segments = {}
        for freq, group in df.groupby('frequency'):
            if pd.isna(freq):
                continue
            skip_col = group['skipped_class'].fillna(False) if 'skipped_class' in group else pd.Series(dtype=float)
            freq_segments[freq] = {
                'n': int(len(group)),
                'avg_pfs': round(group['pfs'].mean(), 3),
                'skip_rate': round(skip_col.mean() * 100, 1) if len(skip_col) > 0 else None
            }
        segments['by_frequency'] = freq_segments

    return segments


def compute_ada_metrics(df: pd.DataFrame) -> dict:
    """Compute ADA-specific metrics."""
    ada = {}

    # Filter to ADA opt-ins
    if 'ada_opted_in' not in df.columns:
        return ada

    ada_df = df[df['ada_opted_in'] == True]
    ada['opted_in'] = int(len(ada_df))

    # Satisfaction
    if 'ada_satisfaction' in ada_df.columns:
        sat_counts = ada_df['ada_satisfaction'].value_counts().to_dict()
        ada['satisfaction'] = {
            'counts': sat_counts,
            'total': int(len(ada_df))
        }

    # Adequacy
    if 'ada_adequate' in ada_df.columns:
        adeq_counts = ada_df['ada_adequate'].value_counts().to_dict()
        ada['adequacy'] = {
            'counts': adeq_counts,
            'total': int(len(ada_df))
        }

    return ada


def main():
    parser = argparse.ArgumentParser(description='Build metrics and theme rollups')
    parser.add_argument('--input', '-i', required=True, help='Path to clean.csv')
    parser.add_argument('--output', '-o', required=True, help='Output directory for artifacts')
    args = parser.parse_args()

    input_path = Path(args.input)
    output_dir = Path(args.output)

    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}")
        return

    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Loading {input_path}...")
    df = pd.read_csv(input_path)
    print(f"  Loaded {len(df)} rows")

    # Compute metrics
    print("\nComputing metrics...")
    metrics = compute_metrics(df)

    # Compute rankings
    print("Computing rankings...")
    rankings = compute_rankings(df)

    # Compute segments
    print("Computing segment breakdowns...")
    segments = compute_segments(df)

    # Compute ADA metrics
    print("Computing ADA metrics...")
    ada = compute_ada_metrics(df)

    # Combine all
    output = {
        'metadata': {
            'generated_at': pd.Timestamp.now().isoformat(),
            'input_file': str(input_path),
            'total_rows': len(df)
        },
        'metrics': metrics,
        'rankings': rankings,
        'segments': segments,
        'ada': ada
    }

    # Save
    output_file = output_dir / 'metrics.json'
    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2, default=str)

    print(f"\n✅ Saved metrics to {output_file}")

    # Print summary
    print("\n📊 Summary:")
    if 'skip_rate' in metrics:
        sr = metrics['skip_rate']
        print(f"  Skip rate: {sr['pct']}% ({sr['n']}/{sr['N']})")
    if 'ease_distribution' in metrics:
        dr = metrics['ease_distribution']['difficult_rate']
        print(f"  Difficulty rate: {dr['pct']}% ({dr['n']}/{dr['N']})")
    if rankings:
        top = list(rankings.keys())[0]
        print(f"  Top challenge: {top} (score: {rankings[top]['weighted_score']})")


if __name__ == '__main__':
    main()
