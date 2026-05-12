'use client';

import { motion } from 'framer-motion';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Legend,
    CartesianGrid,
} from 'recharts';

interface RocCurve {
    fpr: number[];
    tpr: number[];
}

interface RocCurveChartProps {
    lr: RocCurve;
    rf: RocCurve;
    lrAuc: number;
    rfAuc: number;
}

export function RocCurveChart({ lr, rf, lrAuc, rfAuc }: RocCurveChartProps) {
    const rows = [
        ...lr.fpr.map((fpr, i) => ({ fpr, lr_tpr: lr.tpr[i], diagonal: fpr })),
        ...rf.fpr.map((fpr, i) => ({ fpr, rf_tpr: rf.tpr[i], diagonal: fpr })),
    ].sort((a, b) => a.fpr - b.fpr);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="rounded-2xl border border-gray-800 bg-gray-900/50 p-4 sm:p-6 backdrop-blur-sm"
        >
            <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-4">
                ROC Curves
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6">
                True vs false positive rate at every decision threshold. Curves above the dashed diagonal beat random guessing.
            </p>

            <div className="h-[400px] sm:h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rows} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid stroke="#374151" strokeDasharray="2 4" />
                        <XAxis
                            type="number"
                            dataKey="fpr"
                            domain={[0, 1]}
                            stroke="#9ca3af"
                            fontSize={11}
                            tick={{ fill: '#e5e7eb' }}
                            label={{
                                value: 'False Positive Rate',
                                position: 'insideBottom',
                                offset: -10,
                                fill: '#9ca3af',
                                fontSize: 12,
                            }}
                        />
                        <YAxis
                            type="number"
                            domain={[0, 1]}
                            stroke="#9ca3af"
                            fontSize={11}
                            tick={{ fill: '#e5e7eb' }}
                            label={{
                                value: 'True Positive Rate',
                                angle: -90,
                                position: 'insideLeft',
                                fill: '#9ca3af',
                                fontSize: 12,
                            }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1f2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#fff',
                            }}
                            formatter={(value) => {
                                const num = Number(value);
                                return Number.isFinite(num) ? num.toFixed(3) : '—';
                            }}
                            labelFormatter={(label) => {
                                const num = Number(label);
                                return `FPR: ${Number.isFinite(num) ? num.toFixed(3) : label}`;
                            }}
                        />
                        <Legend
                            verticalAlign="top"
                            wrapperStyle={{ paddingBottom: '10px', color: '#d1d5db', fontSize: '12px' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="lr_tpr"
                            name={`Logistic Regression (AUC ${lrAuc.toFixed(3)})`}
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={false}
                            connectNulls
                        />
                        <Line
                            type="monotone"
                            dataKey="rf_tpr"
                            name={`Random Forest (AUC ${rfAuc.toFixed(3)})`}
                            stroke="#22c55e"
                            strokeWidth={2}
                            dot={false}
                            connectNulls
                        />
                        <Line
                            type="monotone"
                            dataKey="diagonal"
                            name="Random baseline"
                            stroke="#6b7280"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            dot={false}
                            connectNulls
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
