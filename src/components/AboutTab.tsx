import { openUrl } from '@tauri-apps/plugin-opener';
import appIcon from '../assets/icon.png';

export function AboutTab() {
    const handleOpenLink = async (url: string) => {
        try {
            await openUrl(url);
        } catch (error) {
            console.error('Failed to open URL:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">About TauriAge</h2>
                <p className="text-slate-600 dark:text-slate-400">Application information and credits.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden max-w-2xl transition-colors duration-200">
                <div className="p-8 space-y-8">
                    {/* App Info */}
                    <div className="flex items-start gap-6">
                        <img
                            src={appIcon}
                            alt="Tauriage Icon"
                            className="w-24 h-24 rounded-2xl shadow-sm"
                        />
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">TauriAge</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-full border border-slate-200 dark:border-slate-700">
                                    v0.2.0
                                </span>
                                <span className="px-2 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full border border-green-100 dark:border-green-800">
                                    Stable
                                </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">
                                A secure, cross-platform file encryption tool built with the power of
                                <span className="font-semibold text-slate-800 dark:text-slate-200"> Age</span> encryption.
                                Designed for simplicity and security.
                            </p>
                        </div>
                    </div>

                    <hr className="border-slate-100 dark:border-slate-800" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Developer Info */}
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Developer</h4>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold">
                                    BE
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-900 dark:text-white">Bernhard Enders</div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400 font-mono">@bgeneto</div>
                                </div>
                            </div>
                        </div>

                        {/* Links */}
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Resources</h4>
                            <div className="space-y-3">
                                <button
                                    onClick={() => handleOpenLink('https://github.com/bgeneto/TauriAge')}
                                    className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group text-sm font-medium"
                                >
                                    <span className="p-1 bg-slate-100 dark:bg-slate-800 rounded group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
                                    </span>
                                    GitHub Repository
                                </button>
                            </div>
                        </div>
                    </div>

                    <hr className="border-slate-100 dark:border-slate-800" />

                    {/* Tech Stack & License */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm">
                        <div className="text-slate-500 dark:text-slate-400">
                            Released under the <span className="font-semibold text-slate-700 dark:text-slate-300">MIT License</span>
                        </div>
                        <div className="flex gap-3">
                            <span className="px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-xs font-mono border border-slate-100 dark:border-slate-700">Tauri 2.0</span>
                            <span className="px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-xs font-mono border border-slate-100 dark:border-slate-700">React</span>
                            <span className="px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-xs font-mono border border-slate-100 dark:border-slate-700">Tailwind v4</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
