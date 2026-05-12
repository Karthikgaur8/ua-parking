import { getModelInsights } from '@/lib/data';
import { StatCard } from '@/components/StatCard';
import { ShapImportanceChart } from '@/components/ShapImportanceChart';
import { RocCurveChart } from '@/components/RocCurveChart';
import { DoseResponseChart } from '@/components/DoseResponseChart';
import { ModelComparisonTable } from '@/components/ModelComparisonTable';
import NavHeader from '@/components/NavHeader';

export default async function ModelsPage() {
    const insights = await getModelInsights();
    const { metadata, models, baseline, engineered_features, dose_response } = insights;
    const lr = models.logistic_regression;
    const rf = models.random_forest;

    const bestF1 = Math.max(lr.test_f1, rf.test_f1);
    const bestF1Model = lr.test_f1 >= rf.test_f1 ? 'Logistic Regression' : 'Random Forest';
    const bestAuc = Math.max(lr.test_auc, rf.test_auc);
    const bestAucModel = lr.test_auc >= rf.test_auc ? 'Logistic Regression' : 'Random Forest';

    return (
        <main className="min-h-screen text-white relative">
            <NavHeader subtitle="Synthetic Model Insights • Binary classification" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Page Title */}
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        Model Insights
                    </h1>
                    <p className="text-white/60 max-w-3xl">
                        Binary classification demo for <code className="text-purple-300">{metadata.target}</code>. These
                        model metrics are synthetic fixtures for UI review, not real student outcomes. Demo training size is{' '}
                        {metadata.modeling_rows.toLocaleString()} records with {metadata.n_features} features.
                    </p>
                </div>

                {/* Hero Stats */}
                <section className="mb-12">
                    <h2 className="text-lg font-semibold text-gray-300 mb-6 uppercase tracking-wider">
                        Key Metrics
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            title="Train Size"
                            value={metadata.train_size.toLocaleString()}
                            subtitle={`${((metadata.train_size / metadata.modeling_rows) * 100).toFixed(0)}% of ${metadata.modeling_rows.toLocaleString()} rows`}
                            color="blue"
                        />
                        <StatCard
                            title="Test Size"
                            value={metadata.test_size.toLocaleString()}
                            subtitle={`Held-out ${((metadata.test_size / metadata.modeling_rows) * 100).toFixed(0)}% (stratified split)`}
                            color="blue"
                        />
                        <StatCard
                            title="Best F1"
                            value={bestF1.toFixed(3)}
                            subtitle={`${bestF1Model} (test set)`}
                            color="green"
                        />
                        <StatCard
                            title="Best AUC-ROC"
                            value={bestAuc.toFixed(3)}
                            subtitle={`${bestAucModel} (test set)`}
                            color="amber"
                        />
                    </div>
                </section>

                {/* Model Comparison */}
                <section className="mb-12">
                    <h2 className="text-lg font-semibold text-gray-300 mb-6 uppercase tracking-wider">
                        Model Comparison
                    </h2>
                    <ModelComparisonTable lr={lr} rf={rf} baseline={baseline} />
                </section>

                {/* SHAP Feature Importance */}
                <section className="mb-12">
                    <h2 className="text-lg font-semibold text-gray-300 mb-6 uppercase tracking-wider">
                        Feature Importance (SHAP)
                    </h2>
                    <ShapImportanceChart data={lr.shap_importance} />
                </section>

                {/* ROC Curves */}
                <section className="mb-12">
                    <h2 className="text-lg font-semibold text-gray-300 mb-6 uppercase tracking-wider">
                        ROC Curves
                    </h2>
                    <RocCurveChart
                        lr={lr.roc_curve}
                        rf={rf.roc_curve}
                        lrAuc={lr.test_auc}
                        rfAuc={rf.test_auc}
                    />
                </section>

                {/* Dose-Response */}
                <section className="mb-12">
                    <h2 className="text-lg font-semibold text-gray-300 mb-6 uppercase tracking-wider">
                        Dose-Response
                    </h2>
                    <DoseResponseChart data={dose_response} />
                </section>

                {/* Methodology */}
                <section className="mb-12">
                    <h2 className="text-lg font-semibold text-gray-300 mb-6 uppercase tracking-wider">
                        Methodology
                    </h2>
                    <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-4 sm:p-6 backdrop-blur-sm">
                        <div className="space-y-4 text-sm text-gray-300 leading-relaxed">
                            <p>
                                <span className="font-semibold text-white">Target:</span>{' '}
                                <code className="text-purple-300">{metadata.target}</code> - synthetic binary label for parking friction in the demo fixture.
                                Positive base rate {(metadata.positive_rate * 100).toFixed(1)}% on n={metadata.modeling_rows.toLocaleString()} demo records.
                            </p>
                            <p>
                                <span className="font-semibold text-white">Split:</span>{' '}
                                Stratified {metadata.train_size.toLocaleString()} train / {metadata.test_size.toLocaleString()} test.
                                All tuning + cross-validation performed on the training set only.
                            </p>
                            <p>
                                <span className="font-semibold text-white">Models:</span>{' '}
                                Logistic regression (L1-regularized, tuned via GridSearchCV) and Random Forest
                                (class-balanced, tuned on depth + min-samples-split + n-estimators). Cross-validation: 5-fold, scored on F1.
                            </p>
                            <p>
                                <span className="font-semibold text-white">Features ({metadata.n_features}):</span>{' '}
                                Demo ordinals (arrival time, frequency, ease, pay-to-park), mode of transport, and {engineered_features.length} engineered features:
                            </p>
                            <ul className="list-disc list-inside space-y-1 pl-4 text-gray-400">
                                {engineered_features.map((f) => (
                                    <li key={f.name}>
                                        <code className="text-purple-300">{f.name}</code> - {f.description}
                                    </li>
                                ))}
                            </ul>
                            <p>
                                <span className="font-semibold text-white">Baseline:</span>{' '}
                                {baseline.description}. Accuracy {baseline.accuracy.toFixed(3)}, F1 {baseline.f1.toFixed(3)}.
                                Because this is fabricated demo data, metrics should be read as interface examples rather than evidence.
                            </p>
                            <p>
                                <span className="font-semibold text-white">Interpretation:</span>{' '}
                                SHAP values (logistic regression) quantify each feature&apos;s mean contribution to the log-odds of skipping.
                                The dose-response table below the model metrics is a synthetic example of how a model-insight page can
                                connect feature patterns to an interpretable outcome.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-gray-800 pt-8 mt-12">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm text-gray-500">
                        <p>
                            Synthetic artifacts generated {new Date(metadata.generated_at).toLocaleDateString()} • No real student data
                        </p>
                        <p>
                            {metadata.dataset_rows.toLocaleString()} demo records • {metadata.n_features} features • Built with Next.js + Recharts
                        </p>
                    </div>
                </footer>
            </div>
        </main>
    );
}
