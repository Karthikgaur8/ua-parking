'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';

// Define types for Vanta
interface VantaEffect {
    destroy: () => void;
}

export default function VantaBackground() {
    const vantaRef = useRef<HTMLDivElement>(null);
    const vantaEffectRef = useRef<VantaEffect | null>(null);
    const threeLoadedRef = useRef(false);
    const vantaLoadedRef = useRef(false);
    const [hasError, setHasError] = useState(false);

    // Initialize Vanta when both scripts are ready
    const initVanta = useCallback(() => {
        if (typeof window === 'undefined') return;
        if (vantaEffectRef.current) return; // Already initialized
        if (!vantaRef.current) return;
        if (!threeLoadedRef.current || !vantaLoadedRef.current) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = window as any;

        // Check that THREE is fully ready
        if (!win.THREE || !win.THREE.Group || !win.THREE.PerspectiveCamera || !win.THREE.WebGLRenderer) {
            return;
        }

        // Check that VANTA.NET is ready
        if (!win.VANTA || !win.VANTA.NET) {
            return;
        }

        try {
            const effect = win.VANTA.NET({
                el: vantaRef.current,
                THREE: win.THREE,
                mouseControls: true,
                touchControls: true,
                gyroControls: false,
                minHeight: 200.00,
                minWidth: 200.00,
                scale: 1.00,
                scaleMobile: 1.00,
                color: 0xff3f81,              // Pink
                backgroundColor: 0x23153c,    // Dark purple
                points: 10.00,
                maxDistance: 20.00,
                spacing: 15.00,
                showDots: true,
            });
            vantaEffectRef.current = effect;
        } catch (error) {
            console.error('Failed to initialize VANTA.NET:', error);
            setHasError(true);
        }
    }, []);

    // Check if scripts are already loaded on mount (from previous navigation)
    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = window as any;

        if (win.THREE && win.THREE.Group && win.THREE.PerspectiveCamera && win.THREE.WebGLRenderer) {
            threeLoadedRef.current = true;
        }
        if (win.VANTA && win.VANTA.NET) {
            vantaLoadedRef.current = true;
        }
        const timer = setTimeout(initVanta, 50);
        return () => clearTimeout(timer);
    }, [initVanta]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            vantaEffectRef.current?.destroy();
            vantaEffectRef.current = null;
        };
    }, []);

    const handleThreeLoad = () => {
        threeLoadedRef.current = true;
        initVanta();
    };

    const handleVantaLoad = () => {
        vantaLoadedRef.current = true;
        initVanta();
    };

    const handleScriptError = () => {
        console.error('Failed to load Vanta.js scripts');
        setHasError(true);
    };

    return (
        <>
            {/* Load THREE.js r134 (required for Vanta NET) */}
            <Script
                src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"
                strategy="afterInteractive"
                onLoad={handleThreeLoad}
                onError={handleScriptError}
            />
            {/* Load Vanta NET */}
            <Script
                src="https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.net.min.js"
                strategy="afterInteractive"
                onLoad={handleVantaLoad}
                onError={handleScriptError}
            />

            {/* Vanta.js animated background */}
            <div
                ref={vantaRef}
                className={`fixed inset-0 -z-10 transition-opacity duration-500 ${hasError ? 'opacity-0' : 'opacity-100'}`}
                aria-hidden="true"
            />

            {/* CSS fallback gradient background */}
            <div
                className="fixed inset-0 -z-20 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950"
                aria-hidden="true"
            >
                {/* Animated gradient orbs for fallback */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            </div>
        </>
    );
}
