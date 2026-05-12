'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: {
        id: string;
        text: string;
        source: string;
        arrival_time: string;
        mode: string;
    }[];
}

interface ChatInterfaceProps {
    initialMessage?: string;
}

export default function ChatInterface({ initialMessage }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "Hi! I'm your parking demo analyst. Ask me anything about the synthetic demo data, like:\n\n• \"What patterns appear in the parking feedback?\"\n• \"What are the main concerns for morning commuters?\"\n• \"Show example feedback about permit value\"",
        },
    ]);
    const [input, setInput] = useState(initialMessage || '');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setError(null);

        // Add user message
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    history: messages.slice(1), // Skip initial greeting
                }),
            });

            const data = await response.json();

            // Handle error responses
            if (!response.ok || data.error) {
                if (response.status === 503 || data.retryAfter) {
                    setError(`⏳ AI service is busy. Please wait ${data.retryAfter || 30}s and try again.`);
                } else if (response.status === 500) {
                    setError('🔧 Server error. Please try again in a moment.');
                } else {
                    setError(data.error || 'Failed to get response. Please try again.');
                }
                return;
            }

            // Add assistant response
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: data.response,
                    sources: data.sources,
                },
            ]);
        } catch (err) {
            setError('❌ Connection error. Please check your internet and try again.');
            console.error('Chat error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-800 text-gray-100'
                                }`}
                        >
                            <div className="whitespace-pre-wrap">{msg.content}</div>

                            {/* Show sources for assistant messages */}
                            {msg.sources && msg.sources.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-700">
                                    <p className="text-xs text-gray-400 mb-2">📚 Sources used:</p>
                                    <div className="space-y-2">
                                        {msg.sources.slice(0, 3).map((source, j) => (
                                            <div
                                                key={j}
                                                className="text-xs bg-gray-900/50 rounded-lg p-2"
                                            >
                                                <span className="text-gray-500">
                                                    [{source.source}] {source.arrival_time}
                                                </span>
                                                <p className="text-gray-300 mt-1 italic">
                                                    &quot;{source.text}&quot;
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-800 rounded-2xl px-4 py-3">
                            <div className="flex space-x-2">
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error message */}
                {error && (
                    <div className="flex justify-center">
                        <div className="bg-red-900/50 text-red-300 rounded-lg px-4 py-2 text-sm">
                            {error}
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={sendMessage} className="p-4 border-t border-gray-800">
                <div className="flex gap-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about the synthetic parking demo..."
                        className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl px-6 py-3 font-medium transition-colors"
                    >
                        {isLoading ? '...' : 'Send'}
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                    Powered by Gemini AI • Gemini embeddings over synthetic demo comments
                </p>
            </form>
        </div>
    );
}
