'use client';

import React, { useState } from 'react';

interface Theme {
    id: number;
    label: string;
    count: number;
    pct: number;
    quotes: string[];
}

interface ThemeExplorerProps {
    themes: Theme[];
}

export default function ThemeExplorer({ themes }: ThemeExplorerProps) {
    const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter themes by search
    const filteredThemes = themes.filter(theme =>
        searchQuery === '' ||
        theme.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        theme.quotes.some(q => q.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Color palette for theme cards
    const colors = [
        'from-rose-500 to-pink-600',
        'from-violet-500 to-purple-600',
        'from-blue-500 to-indigo-600',
        'from-emerald-500 to-teal-600',
        'from-amber-500 to-orange-600',
        'from-cyan-500 to-blue-600',
        'from-fuchsia-500 to-pink-600',
        'from-lime-500 to-green-600',
    ];

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search themes or examples..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 pl-12 bg-white/5 border border-white/10 rounded-xl
                     text-white placeholder-white/40 focus:outline-none focus:border-white/30
                     focus:ring-2 focus:ring-violet-500/20 transition-all"
                />
                <svg
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
            </div>

            {/* Theme Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredThemes.map((theme, index) => (
                    <button
                        key={theme.id}
                        onClick={() => setSelectedTheme(selectedTheme?.id === theme.id ? null : theme)}
                        className={`relative p-5 rounded-xl text-left transition-all duration-300
                       ${selectedTheme?.id === theme.id
                                ? 'ring-2 ring-white/50 scale-[1.02]'
                                : 'hover:scale-[1.02]'}
                       bg-gradient-to-br ${colors[index % colors.length]}
                       shadow-lg hover:shadow-xl`}
                    >
                        {/* Theme Label */}
                        <h3 className="text-lg font-semibold text-white mb-2">
                            {theme.label}
                        </h3>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-white/80 text-sm">
                            <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                </svg>
                                {theme.count} demo records
                            </span>
                            <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
                                {theme.pct}%
                            </span>
                        </div>

                        {/* Preview Quote */}
                        {theme.quotes[0] && (
                            <p className="mt-3 text-sm text-white/70 line-clamp-2 italic">
                                &quot;{theme.quotes[0].slice(0, 80)}...&quot;
                            </p>
                        )}

                        {/* Expand Indicator */}
                        <div className={`absolute bottom-3 right-3 transition-transform duration-200
                            ${selectedTheme?.id === theme.id ? 'rotate-180' : ''}`}>
                            <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </button>
                ))}
            </div>

            {/* Expanded Theme Detail */}
            {selectedTheme && (
                <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-white">
                            {selectedTheme.label} - Demo Examples
                        </h3>
                        <button
                            onClick={() => setSelectedTheme(null)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {selectedTheme.quotes.map((quote, idx) => (
                            <blockquote
                                key={idx}
                                className="p-4 bg-white/5 rounded-lg border-l-4 border-violet-500/50
                          text-white/80 text-sm italic"
                            >
                                &quot;{quote}&quot;
                            </blockquote>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {filteredThemes.length === 0 && (
                <div className="text-center py-12">
                    <svg className="w-16 h-16 mx-auto text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-white/40">No themes match your search</p>
                </div>
            )}

        </div>
    );
}
