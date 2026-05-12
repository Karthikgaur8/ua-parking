'use client';

import React, { useState, useEffect } from 'react';
import ThemeExplorer from '@/components/ThemeExplorer';
import NavHeader from '@/components/NavHeader';

interface Theme {
    id: number;
    label: string;
    count: number;
    pct: number;
    quotes: string[];
    segments?: {
        by_arrival_time: Record<string, number>;
        by_mode: Record<string, number>;
        skip_rate: number | null;
    };
}

interface ThemesResponse {
    metadata: {
        generated_at: string;
        total_texts: number;
        n_clusters: number;
    };
    themes: Theme[];
}

// Mock data for development
const mockThemes: Theme[] = [
    {
        id: 0,
        label: 'Parking Availability',
        count: 87,
        pct: 32.1,
        quotes: [
            'Synthetic example: I usually leave early because the first lot I try is already full.',
            'Synthetic example: Mid-morning feels like the hardest time to find an open space.',
            'Synthetic example: More real-time lot capacity signs would reduce circling.',
            'Synthetic example: A small reserve of short-term spaces near academic buildings would help.',
            'Synthetic example: The issue is knowing where open spaces are before arriving.',
        ],
    },
    {
        id: 1,
        label: 'Permit Value',
        count: 64,
        pct: 23.6,
        quotes: [
            'Synthetic example: A permit feels more valuable when spaces are reliable.',
            'Synthetic example: Pricing should reflect how far a driver may need to park from class.',
            'Synthetic example: Better communication about zone capacity would make the cost easier to understand.',
            'Synthetic example: The frustration comes from paying for access and still needing extra search time.',
            'Synthetic example: Students want clearer tradeoffs between cheaper remote parking and closer premium options.',
        ],
    },
    {
        id: 2,
        label: 'Distance from Classes',
        count: 52,
        pct: 19.2,
        quotes: [
            'Synthetic example: The walk is manageable on some days, but it becomes a problem between back-to-back classes.',
            'Synthetic example: A shuttle loop from remote lots would make the assignment system feel more practical.',
            'Synthetic example: Students with tight schedules need parking zones that better match class locations.',
            'Synthetic example: Remote lots work better when the path is clear, safe, and predictable.',
            'Synthetic example: Distance matters most when bad weather or evening classes are involved.',
        ],
    },
    {
        id: 3,
        label: 'Peak Time Issues',
        count: 38,
        pct: 14.0,
        quotes: [
            'Synthetic example: Later morning arrivals seem to need a larger schedule buffer.',
            'Synthetic example: Peak arrival windows create the most uncertainty in the demo data.',
            'Synthetic example: Staggered demand would make the current parking system feel easier to use.',
            'Synthetic example: Morning congestion is where better lot guidance would matter most.',
            'Synthetic example: Reserved short-term capacity could help students with tight transitions.',
        ],
    },
    {
        id: 4,
        label: 'Navigation & Signage',
        count: 30,
        pct: 11.1,
        quotes: [
            'Synthetic example: Clearer signs at lot entrances would reduce wrong turns during peak times.',
            'Synthetic example: A map that updates by zone would help drivers choose a lot before crossing campus.',
            'Synthetic example: Some lots are easy to miss if you do not already know the campus layout.',
            'Synthetic example: The parking app should make zone boundaries easier to understand.',
            'Synthetic example: Better wayfinding would make the current parking supply feel less confusing.',
        ],
    },
];

export default function EvidencePage() {
    const [themes, setThemes] = useState<Theme[]>(mockThemes);
    const [loading, setLoading] = useState(true);
    const [metadata, setMetadata] = useState<ThemesResponse['metadata'] | null>(null);

    useEffect(() => {
        async function loadThemes() {
            try {
                const res = await fetch('/api/evidence');
                if (!res.ok) throw new Error('Failed to load themes');

                const data: ThemesResponse = await res.json();

                if (data.themes && data.themes.length > 0) {
                    // Fetch full details for each theme
                    const fullThemes = await Promise.all(
                        data.themes.map(async (t) => {
                            const detailRes = await fetch(`/api/evidence?theme=${t.id}`);
                            return detailRes.ok ? await detailRes.json() : t;
                        })
                    );
                    setThemes(fullThemes);
                    setMetadata(data.metadata);
                }
                // If no themes from API, keep mock data
            } catch (err) {
                console.log('Using mock data:', err);
                // Keep mock data on error
            } finally {
                setLoading(false);
            }
        }

        loadThemes();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <NavHeader subtitle="Evidence Engine" />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Page Title */}
                <div className="mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                        Evidence Engine
                    </h1>
                    <p className="text-white/60 max-w-2xl">
                        AI-powered thematic analysis view using {metadata?.total_texts || 271} synthetic demo comments.
                        Each theme includes representative synthetic examples for product demonstration.
                    </p>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="text-2xl font-bold text-white">{themes.length}</div>
                        <div className="text-sm text-white/50">Themes Identified</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="text-2xl font-bold text-white">
                            {metadata?.total_texts || themes.reduce((sum, t) => sum + t.count, 0)}
                        </div>
                        <div className="text-sm text-white/50">Demo Comments</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="text-2xl font-bold text-white">
                            {themes.reduce((sum, t) => sum + t.quotes.length, 0)}
                        </div>
                        <div className="text-sm text-white/50">Synthetic Examples</div>
                    </div>
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                        <div className="text-2xl font-bold text-emerald-400">Ready</div>
                        <div className="text-sm text-white/50">For Analysis</div>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full" />
                    </div>
                )}

                {/* Theme Explorer */}
                {!loading && <ThemeExplorer themes={themes} />}

                {/* Methodology Note */}
                <div className="mt-8 sm:mt-12 p-4 sm:p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5 text-violet-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Methodology
                    </h3>
                    <p className="text-white/60 text-sm leading-relaxed">
                        In the private workflow, themes can be identified by LLM-assisted qualitative analysis.
                        This public view uses fabricated comments that preserve the interface shape without
                        exposing real responses. Comments can relate to multiple themes, so theme counts may
                        exceed total comments.
                    </p>
                </div>
            </main>
        </div>
    );
}
