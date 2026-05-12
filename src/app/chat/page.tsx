import ChatInterface from '@/components/ChatInterface';
import NavHeader from '@/components/NavHeader';

export const metadata = {
    title: 'AI Chat | UA Parking Analytics',
    description: 'Ask questions about the synthetic parking demo dataset using natural language',
};

export default function ChatPage() {
    return (
        <main className="min-h-screen bg-gray-950 text-white">
            <NavHeader subtitle="AI Demo Analyst" />

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Info Banner */}
                <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 border border-blue-800/50">
                    <div className="flex items-start gap-3 sm:gap-4">
                        <div className="text-2xl sm:text-4xl">💡</div>
                        <div>
                            <h2 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">How It Works</h2>
                            <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                                This AI assistant uses <strong>semantic Retrieval-Augmented Generation (RAG)</strong> to answer
                                questions about a synthetic parking feedback dataset. It searches demo comments embedded with
                                Gemini, finds the most relevant examples, and uses them to generate source-backed answers.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Chat Interface */}
                <div className="h-[450px] sm:h-[600px]">
                    <ChatInterface />
                </div>

                {/* Example Questions */}
                <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="bg-gray-900 rounded-xl p-3 sm:p-4 border border-gray-800">
                        <p className="text-gray-400 text-xs sm:text-sm mb-1 sm:mb-2">Try asking:</p>
                        <p className="text-white text-sm sm:text-base">&quot;What patterns appear in the demo parking feedback?&quot;</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-3 sm:p-4 border border-gray-800">
                        <p className="text-gray-400 text-xs sm:text-sm mb-1 sm:mb-2">Try asking:</p>
                        <p className="text-white text-sm sm:text-base">&quot;What does the demo data say about transit connections?&quot;</p>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-3 sm:p-4 border border-gray-800">
                        <p className="text-gray-400 text-xs sm:text-sm mb-1 sm:mb-2">Try asking:</p>
                        <p className="text-white text-sm sm:text-base">&quot;Show example feedback about permit value.&quot;</p>
                    </div>
                </div>
            </div>
        </main>
    );
}
