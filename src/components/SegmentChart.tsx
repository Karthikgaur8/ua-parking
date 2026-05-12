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

interface SegmentChartProps {
    title: string;
    segments: Record<string, { n: number; avg_pfs: number; skip_rate: number; avg_minutes?: number }>;
    metric: 'avg_pfs' | 'skip_rate' | 'avg_minutes';
    metricLabel: string;
    order?: string[];
}

export function SegmentChart({ title, segments, metric, metricLabel, order }: SegmentChartProps) {
    let data = Object.entries(segments).map(([name, stats]) => ({
        name: name.length > 15 ? name.substring(0, 13) + '...' : name,
        fullName: name,
        value: stats[metric] ?? 0,
        n: stats.n,
    }));

    // Sort by custom order if provided
    if (order) {
        data = data.sort((a, b) => {
            const aIndex = order.indexOf(a.fullName);
            const bIndex = order.indexOf(b.fullName);
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
        });
    }

    // Color based on value (higher = more red for PFS/skip, amber for neutral)
    const getColor = (value: number) => {
        if (metric === 'avg_pfs') {
            if (value > 0.7) return '#ef4444';
            if (value > 0.5) return '#f97316';
            if (value > 0.3) return '#eab308';
            return '#22c55e';
        }
        if (metric === 'skip_rate') {
            if (value > 85) return '#ef4444';
            if (value > 75) return '#f97316';
            if (value > 65) return '#eab308';
            return '#22c55e';
        }
        // For minutes
        if (value > 20) return '#ef4444';
        if (value > 15) return '#f97316';
        if (value > 10) return '#eab308';
        return '#22c55e';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="rounded-2xl border border-gray-800 bg-gray-900/50 p-4 sm:p-6 backdrop-blur-sm"
        >
            <h3 className="text-base sm:text-lg font-semibold text-white mb-4">{title}</h3>

            <div className="h-[280px] sm:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                        <XAxis
                            dataKey="name"
                            stroke="#9ca3af"
                            fontSize={11}
                            angle={-35}
                            textAnchor="end"
                            height={100}
                            tickLine={false}
                            interval={0}
                            tick={{ fill: '#e5e7eb', dy: 10 }}
                            tickMargin={10}
                        />
                        <YAxis stroke="#9ca3af" fontSize={12} tick={{ fill: '#e5e7eb' }} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1f2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#fff',
                            }}
                            formatter={(value, _name, props) => {
                                const numValue = Number(value) || 0;
                                const payload = props?.payload as { fullName?: string; n?: number } | undefined;
                                return [
                                    `${metricLabel}: ${numValue.toFixed(1)}${metric === 'skip_rate' ? '%' : ''}`,
                                    `${payload?.fullName ?? ''} (n=${payload?.n ?? 0})`,
                                ];
                            }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getColor(entry.value)} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
