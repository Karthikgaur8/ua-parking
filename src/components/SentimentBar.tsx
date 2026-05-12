'use client';

import { motion } from 'framer-motion';

interface SentimentBarProps {
    data: Record<string, number>;
    title: string;
}

export function SentimentBar({ data, title }: SentimentBarProps) {
    // Map the data to our categories
    const lotLess = data['Need a lot less of them'] || 0;
    const slightlyLess = data['Need slightly less of them'] || 0;
    const keepSame = data['Keep the same number'] || 0;
    const slightlyMore = data['Need slightly more of them'] || 0;
    const lotMore = data['Need a lot more of them'] || 0;

    const total = lotLess + slightlyLess + keepSame + slightlyMore + lotMore;

    // Calculate percentages
    const pctLotLess = (lotLess / total) * 100;
    const pctSlightlyLess = (slightlyLess / total) * 100;
    const pctKeepSame = (keepSame / total) * 100;
    const pctSlightlyMore = (slightlyMore / total) * 100;
    const pctLotMore = (lotMore / total) * 100;

    const totalLess = pctLotLess + pctSlightlyLess;
    const totalMore = pctSlightlyMore + pctLotMore;

    // Weighted mean on -2 to +2 Likert scale
    const weightedMean = total > 0
        ? (-2 * lotLess + -1 * slightlyLess + 0 * keepSame + 1 * slightlyMore + 2 * lotMore) / total
        : 0;

    // Determine overall sentiment
    const sentiment = weightedMean > 0
        ? { label: 'Lean MORE', color: 'text-emerald-400', arrow: '→' }
        : weightedMean < 0
            ? { label: 'Lean LESS', color: 'text-rose-400', arrow: '←' }
            : { label: 'Balanced', color: 'text-gray-400', arrow: '↔' };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-sm min-h-[320px] flex flex-col"
        >
            <h3 className="text-lg font-semibold text-white mb-3 text-center">{title}</h3>

            {/* Content wrapper - centers the bar and legend */}
            <div className="flex-1 flex flex-col justify-center">
                {/* Overall sentiment indicator */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    <span className={`text-2xl font-bold ${sentiment.color}`}>
                        {sentiment.arrow} {sentiment.label}
                    </span>
                    <span className="text-sm text-gray-500">
                        ({weightedMean >= 0 ? '+' : ''}{weightedMean.toFixed(2)} on ±2 scale)
                    </span>
                </div>

                {/* Diverging bar */}
                <div className="mb-4">
                    <div className="flex items-center gap-1">
                        {/* Left side - Want Less */}
                        <div className="flex-1 flex justify-end gap-0.5">
                            {pctLotLess > 0 && (
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(pctLotLess / (totalLess + pctKeepSame / 2)) * 100}%` }}
                                    transition={{ duration: 0.8, delay: 0.3 }}
                                    className="h-10 bg-rose-500 rounded-l-md flex items-center justify-center overflow-hidden"
                                    title={`A lot less: ${lotLess} (${pctLotLess.toFixed(1)}%)`}
                                >
                                    {pctLotLess > 8 && (
                                        <span className="text-xs text-white font-medium">{pctLotLess.toFixed(0)}%</span>
                                    )}
                                </motion.div>
                            )}
                            {pctSlightlyLess > 0 && (
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(pctSlightlyLess / (totalLess + pctKeepSame / 2)) * 100}%` }}
                                    transition={{ duration: 0.8, delay: 0.2 }}
                                    className="h-10 bg-rose-400/60 flex items-center justify-center overflow-hidden"
                                    title={`Slightly less: ${slightlyLess} (${pctSlightlyLess.toFixed(1)}%)`}
                                >
                                    {pctSlightlyLess > 8 && (
                                        <span className="text-xs text-white/80 font-medium">{pctSlightlyLess.toFixed(0)}%</span>
                                    )}
                                </motion.div>
                            )}
                        </div>

                        {/* Center - Keep Same */}
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '60px' }}
                            transition={{ duration: 0.5 }}
                            className="h-10 bg-gray-600 flex items-center justify-center flex-shrink-0"
                            title={`Keep same: ${keepSame} (${pctKeepSame.toFixed(1)}%)`}
                        >
                            <span className="text-xs text-white/80 font-medium">{pctKeepSame.toFixed(0)}%</span>
                        </motion.div>

                        {/* Right side - Want More */}
                        <div className="flex-1 flex gap-0.5">
                            {pctSlightlyMore > 0 && (
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(pctSlightlyMore / (totalMore + pctKeepSame / 2)) * 100}%` }}
                                    transition={{ duration: 0.8, delay: 0.2 }}
                                    className="h-10 bg-emerald-400/60 flex items-center justify-center overflow-hidden"
                                    title={`Slightly more: ${slightlyMore} (${pctSlightlyMore.toFixed(1)}%)`}
                                >
                                    {pctSlightlyMore > 8 && (
                                        <span className="text-xs text-white/80 font-medium">{pctSlightlyMore.toFixed(0)}%</span>
                                    )}
                                </motion.div>
                            )}
                            {pctLotMore > 0 && (
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(pctLotMore / (totalMore + pctKeepSame / 2)) * 100}%` }}
                                    transition={{ duration: 0.8, delay: 0.3 }}
                                    className="h-10 bg-emerald-500 rounded-r-md flex items-center justify-center overflow-hidden"
                                    title={`A lot more: ${lotMore} (${pctLotMore.toFixed(1)}%)`}
                                >
                                    {pctLotMore > 8 && (
                                        <span className="text-xs text-white font-medium">{pctLotMore.toFixed(0)}%</span>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    </div>

                    {/* Axis labels */}
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                        <span>← Less pay-to-park</span>
                        <span>Keep same</span>
                        <span>More pay-to-park →</span>
                    </div>
                </div>

                {/* Legend */}
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                    <div>
                        <div className="w-4 h-4 bg-rose-500 rounded mx-auto mb-1"></div>
                        <div className="text-gray-400">A lot less</div>
                        <div className="text-white font-medium">{lotLess}</div>
                    </div>
                    <div>
                        <div className="w-4 h-4 bg-rose-400/60 rounded mx-auto mb-1"></div>
                        <div className="text-gray-400">Slightly less</div>
                        <div className="text-white font-medium">{slightlyLess}</div>
                    </div>
                    <div>
                        <div className="w-4 h-4 bg-gray-600 rounded mx-auto mb-1"></div>
                        <div className="text-gray-400">Keep same</div>
                        <div className="text-white font-medium">{keepSame}</div>
                    </div>
                    <div>
                        <div className="w-4 h-4 bg-emerald-500 rounded mx-auto mb-1"></div>
                        <div className="text-gray-400">A lot more</div>
                        <div className="text-white font-medium">{lotMore}</div>
                    </div>
                    <div>
                        <div className="w-4 h-4 bg-emerald-400/60 rounded mx-auto mb-1"></div>
                        <div className="text-gray-400">Slightly more</div>
                        <div className="text-white font-medium">{slightlyMore}</div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
