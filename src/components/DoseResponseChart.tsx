'use client';

import { motion } from 'framer-motion';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';

const DIFFICULTY_COLORS: Record<string, string> = {
    'Very Easy': '#22c55e',
    'Easy': '#84cc16',
    'Neutral': '#eab308',
    'Difficult': '#f97316',
    'Very Difficult': '#ef4444',
};

interface DoseResponseChartProps {
    data: { ease: string; skip_rate: number; n: number }[];
}

export function DoseResponseChart({ data }: DoseResponseChartProps) {
    const chartData = data.map((d) => ({
        name: d.ease,
        skip_rate: d.skip_rate,
        n: d.n,
        color: DIFFICULTY_COLORS[d.ease] || '#3b82f6',
    }));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="rounded-2xl border border-gray-800 bg-gray-900/50 p-4 sm:p-6 backdrop-blur-sm"
        >
            <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-4">
                Dose-Response: Parking Ease vs Skip Rate
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6">
                Monotonic: harder parking → more skipped classes. Supports causal story.
            </p>

            <div className="h-[280px] sm:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                        <XAxis
                            dataKey="name"
                            stroke="#9ca3af"
                            fontSize={11}
                            tickLine={false}
                            interval={0}
                            tick={{ fill: '#e5e7eb' }}
                            tickMargin={10}
                        />
                        <YAxis
                            stroke="#9ca3af"
                            fontSize={12}
                            tick={{ fill: '#e5e7eb' }}
                            domain={[0, 100]}
                            tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1f2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#fff',
                            }}
                            formatter={(value, _name, props) => {
                                const payload = props?.payload as { n?: number } | undefined;
                                const num = Number(value) || 0;
                                return [`${num}%`, `Skip rate (n=${payload?.n ?? 0})`];
                            }}
                        />
                        <Bar dataKey="skip_rate" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
