'use client';

import { motion } from 'framer-motion';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import type { FeatureImportance } from '@/lib/data';

interface ShapImportanceChartProps {
    data: FeatureImportance[];
}

export function ShapImportanceChart({ data }: ShapImportanceChartProps) {
    const chartData = data.map((d) => ({
        name: d.feature.length > 25 ? d.feature.substring(0, 23) + '...' : d.feature,
        fullName: d.feature,
        importance: d.importance,
    }));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl border border-gray-800 bg-gray-900/50 p-4 sm:p-6 backdrop-blur-sm"
        >
            <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-4">
                SHAP Feature Importance
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6">
                Mean |SHAP value| per feature — Logistic Regression. Higher = more influence on skip-class prediction.
            </p>

            <div className="h-[400px] sm:h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                    >
                        <XAxis type="number" stroke="#9ca3af" fontSize={11} tick={{ fill: '#e5e7eb' }} />
                        <YAxis
                            type="category"
                            dataKey="name"
                            stroke="#9ca3af"
                            fontSize={11}
                            width={180}
                            tickLine={false}
                            tick={{ fill: '#e5e7eb' }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1f2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#fff',
                            }}
                            formatter={(value, _name, props) => {
                                const payload = props?.payload as { fullName?: string } | undefined;
                                const num = Number(value) || 0;
                                return [num.toFixed(4), payload?.fullName ?? ''];
                            }}
                        />
                        <Bar dataKey="importance" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
