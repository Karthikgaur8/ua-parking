'use client';

import { motion } from 'framer-motion';
import type { ModelResult } from '@/lib/data';

interface ModelComparisonTableProps {
    lr: ModelResult;
    rf: ModelResult;
    baseline: { accuracy: number; f1: number; description: string };
}

type Cell = { value: number | null; display: string };

export function ModelComparisonTable({ lr, rf, baseline }: ModelComparisonTableProps) {
    const fmt = (n: number) => n.toFixed(3);

    const rows: { metric: string; lr: Cell; rf: Cell; baseline: Cell }[] = [
        {
            metric: 'Accuracy',
            lr: { value: lr.test_accuracy, display: fmt(lr.test_accuracy) },
            rf: { value: rf.test_accuracy, display: fmt(rf.test_accuracy) },
            baseline: { value: baseline.accuracy, display: fmt(baseline.accuracy) },
        },
        {
            metric: 'F1',
            lr: { value: lr.test_f1, display: fmt(lr.test_f1) },
            rf: { value: rf.test_f1, display: fmt(rf.test_f1) },
            baseline: { value: baseline.f1, display: fmt(baseline.f1) },
        },
        {
            metric: 'AUC-ROC',
            lr: { value: lr.test_auc, display: fmt(lr.test_auc) },
            rf: { value: rf.test_auc, display: fmt(rf.test_auc) },
            baseline: { value: null, display: '—' },
        },
        {
            metric: 'CV F1 (mean)',
            lr: { value: lr.cv_f1, display: fmt(lr.cv_f1) },
            rf: { value: rf.cv_f1, display: fmt(rf.cv_f1) },
            baseline: { value: null, display: '—' },
        },
    ];

    const winnerClass = (cell: Cell, all: Cell[]) => {
        const values = all
            .map((c) => c.value)
            .filter((v): v is number => v !== null);
        if (cell.value === null || values.length === 0) return 'text-gray-400';
        const max = Math.max(...values);
        return cell.value === max ? 'text-emerald-400 font-semibold' : 'text-gray-300';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl border border-gray-800 bg-gray-900/50 p-4 sm:p-6 backdrop-blur-sm overflow-x-auto"
        >
            <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-4">
                Model Comparison
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6">
                Test-set metrics for both tuned models plus majority-class baseline. Best value per row highlighted in green.
            </p>

            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-800 text-gray-400 uppercase tracking-wider text-xs">
                        <th className="text-left py-3 px-2 font-medium">Metric</th>
                        <th className="text-right py-3 px-2 font-medium">Logistic Regression</th>
                        <th className="text-right py-3 px-2 font-medium">Random Forest</th>
                        <th className="text-right py-3 px-2 font-medium">Baseline</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const all = [row.lr, row.rf, row.baseline];
                        return (
                            <tr key={row.metric} className="border-b border-gray-800/50">
                                <td className="py-3 px-2 text-gray-300 font-medium">{row.metric}</td>
                                <td className={`py-3 px-2 text-right tabular-nums ${winnerClass(row.lr, all)}`}>
                                    {row.lr.display}
                                </td>
                                <td className={`py-3 px-2 text-right tabular-nums ${winnerClass(row.rf, all)}`}>
                                    {row.rf.display}
                                </td>
                                <td className={`py-3 px-2 text-right tabular-nums ${winnerClass(row.baseline, all)}`}>
                                    {row.baseline.display}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <p className="text-xs text-gray-500 mt-4">
                Baseline: {baseline.description}. Baseline has no AUC (no score) and no CV (not trained).
            </p>
        </motion.div>
    );
}
