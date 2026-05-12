'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavHeaderProps {
    subtitle?: string;
}

export default function NavHeader({ subtitle }: NavHeaderProps) {
    const pathname = usePathname();

    const navLinks = [
        { href: '/', label: 'Dashboard' },
        { href: '/evidence', label: 'Evidence' },
        { href: '/chat', label: '🤖 Chat' },
    ];

    return (
        <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                    {/* Logo/Title - Left Side */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-3xl sm:text-5xl font-black bg-gradient-to-br from-blue-400 to-purple-500 bg-clip-text text-transparent">
                            SGA
                        </span>
                        <div>
                            <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                                UA Parking Intelligence
                            </h1>
                            {subtitle && (
                                <p className="text-xs text-gray-400">{subtitle}</p>
                            )}
                        </div>
                    </div>

                    {/* Navigation - Right Side */}
                    <nav className="flex items-center gap-1 sm:gap-2">
                        {navLinks.map((link) => {
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${isActive
                                        ? 'text-white bg-white/10'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>
        </header>
    );
}
