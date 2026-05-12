/**
 * Evidence API Endpoint
 *
 * GET /api/evidence
 *   Returns all themes with quotes and metadata
 *
 * GET /api/evidence?theme=<id>
 *   Returns specific theme details
 *
 * GET /api/evidence?search=<query>
 *   Searches quotes (keyword-based for MVP)
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface Theme {
    id: number;
    label: string;
    count: number;
    pct: number;
    quotes: string[];
    segments: {
        by_arrival_time: Record<string, number>;
        by_mode: Record<string, number>;
        skip_rate: number | null;
    };
}

interface ThemesData {
    metadata: {
        generated_at: string;
        input_file: string;
        total_texts: number;
        n_clusters: number;
    };
    themes: Theme[];
}

// Cache themes in memory with file-stat invalidation
let cachedThemes: ThemesData | null = null;
let themesLastModified: number = 0;

async function loadThemes(): Promise<ThemesData> {
    const themesPath = path.join(process.cwd(), 'artifacts', 'themes.json');

    try {
        // Check if file has changed since last load
        const { statSync } = await import('fs');
        const stat = statSync(themesPath);
        const mtime = stat.mtimeMs;

        if (cachedThemes && mtime === themesLastModified) {
            return cachedThemes;
        }

        // File changed or first load — reload
        const content = await fs.readFile(themesPath, 'utf-8');
        cachedThemes = JSON.parse(content);
        themesLastModified = mtime;
        return cachedThemes!;
    } catch (error) {
        // Return mock data for development
        return {
            metadata: {
                generated_at: new Date().toISOString(),
                input_file: 'mock',
                total_texts: 0,
                n_clusters: 0,
            },
            themes: [],
        };
    }
}

function searchQuotes(themes: Theme[], query: string): Array<{
    quote: string;
    theme: string;
    themeId: number;
    score: number;
}> {
    const queryLower = query.toLowerCase();
    const terms = queryLower.split(/\s+/).filter(t => t.length > 2);

    const results: Array<{
        quote: string;
        theme: string;
        themeId: number;
        score: number;
    }> = [];

    for (const theme of themes) {
        for (const quote of theme.quotes) {
            const quoteLower = quote.toLowerCase();
            let score = 0;

            // Full query match
            if (quoteLower.includes(queryLower)) {
                score += 10;
            }

            // Individual term matches
            for (const term of terms) {
                if (quoteLower.includes(term)) {
                    score += 1;
                }
            }

            if (score > 0) {
                results.push({
                    quote,
                    theme: theme.label,
                    themeId: theme.id,
                    score,
                });
            }
        }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, 20);
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const themeId = searchParams.get('theme');
        const searchQuery = searchParams.get('search');

        const data = await loadThemes();

        // Search endpoint
        if (searchQuery) {
            const results = searchQuotes(data.themes, searchQuery);
            return NextResponse.json({
                query: searchQuery,
                count: results.length,
                results,
            });
        }

        // Single theme endpoint
        if (themeId !== null) {
            const id = parseInt(themeId, 10);
            const theme = data.themes.find(t => t.id === id);

            if (!theme) {
                return NextResponse.json(
                    { error: 'Theme not found' },
                    { status: 404 }
                );
            }

            return NextResponse.json(theme);
        }

        // All themes endpoint
        return NextResponse.json({
            metadata: data.metadata,
            themes: data.themes.map(t => ({
                id: t.id,
                label: t.label,
                count: t.count,
                pct: t.pct,
                quoteCount: t.quotes.length,
                // Include first 2 quotes as preview
                previewQuotes: t.quotes.slice(0, 2),
            })),
        });
    } catch (error) {
        console.error('Evidence API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
