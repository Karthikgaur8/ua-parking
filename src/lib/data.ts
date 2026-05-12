import fs from 'fs';
import path from 'path';

export interface Metrics {
    metadata: {
        generated_at: string;
        input_file: string;
        total_rows: number;
    };
    metrics: {
        total_responses: { n: number; completed: number };
        mode_distribution: { counts: Record<string, number>; total: number };
        frequency_distribution: { counts: Record<string, number>; total: number };
        ease_distribution: {
            counts: Record<string, number>;
            total: number;
            difficult_rate: { n: number; N: number; pct: number };
        };
        arrival_distribution: { counts: Record<string, number>; total: number };
        skip_rate: { n: number; N: number; pct: number };
        minutes_searching: { mean: number; median: number; min: number; max: number; n: number };
        pay_to_park_sentiment: { counts: Record<string, number>; total: number };
        crimson_ride_awareness: { n: number; N: number; pct: number };
        crimson_ride_willingness: { n: number; N: number; pct: number };
    };
    rankings: Record<string, {
        rank_counts: Record<number, number>;
        weighted_score: number;
        top3_count: number;
        top3_pct: number;
        total_ranked: number;
    }>;
    segments: {
        by_arrival_time: Record<string, { n: number; avg_pfs: number; skip_rate: number; avg_minutes: number }>;
        by_mode: Record<string, { n: number; avg_pfs: number; skip_rate: number }>;
        by_frequency: Record<string, { n: number; avg_pfs: number; skip_rate: number }>;
    };
    ada: {
        opted_in: number;
        satisfaction: { counts: Record<string, number>; total: number };
        adequacy: { counts: Record<string, number>; total: number };
    };
}

export async function getMetrics(): Promise<Metrics> {
    const filePath = path.join(process.cwd(), 'artifacts', 'metrics.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContents);
}

export interface FeatureImportance {
    feature: string;
    importance: number;
}

export interface ModelResult {
    best_params: Record<string, unknown>;
    cv_f1: number;
    test_accuracy: number;
    test_f1: number;
    test_auc: number;
    confusion_matrix: number[][];
    roc_curve: { fpr: number[]; tpr: number[] };
}

export interface ModelInsights {
    metadata: {
        generated_at: string;
        dataset_rows: number;
        modeling_rows: number;
        n_features: number;
        target: string;
        positive_rate: number;
        test_size: number;
        train_size: number;
    };
    engineered_features: { name: string; description: string }[];
    models: {
        logistic_regression: ModelResult & { shap_importance: FeatureImportance[] };
        random_forest: ModelResult & { feature_importance: FeatureImportance[] };
    };
    baseline: { accuracy: number; f1: number; description: string };
    dose_response: { ease: string; skip_rate: number; n: number }[];
}

export async function getModelInsights(): Promise<ModelInsights> {
    const filePath = path.join(process.cwd(), 'artifacts', 'model_insights.json');
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContents);
}
