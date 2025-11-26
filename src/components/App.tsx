import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { KeyManagementTab } from './KeyManagementTab';
import { EncryptionTab } from './EncryptionTab';
import { DecryptionTab } from './DecryptionTab';
import { AboutTab } from './AboutTab';
import Toast, { ToastMessage } from './Toast';
import { EncryptionStateProvider, useEncryptionState } from '../context/EncryptionStateContext';
import { ThemeToggle } from './ThemeToggle';

type TabType = 'keys' | 'encrypt' | 'decrypt' | 'about';

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('keys');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const { setStoredKeys } = useEncryptionState();

  const tabs = [
    { id: 'keys' as const, label: 'Key Management', description: 'Generate and manage age keys', icon: '🔑' },
    { id: 'encrypt' as const, label: 'Encrypt', description: 'Encrypt files', icon: '🔒' },
    { id: 'decrypt' as const, label: 'Decrypt', description: 'Decrypt files', icon: '🔓' },
    { id: 'about' as const, label: 'About', description: 'Version & Info', icon: 'ℹ️' },
  ];

  const showToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Auto-load stored keys on app startup (runs once)
  useEffect(() => {
    const autoLoadStoredKeys = async () => {
      try {
        // Get the auto-passphrase
        const passphrase = await invoke<string>('get_or_create_passphrase_cmd');

        // Check if key storage exists
        const keyStorageExists = await invoke<boolean>('key_storage_exists_cmd', {});

        if (keyStorageExists) {
          // Load the stored keys
          const loadedKeys = await invoke<any[]>('load_key_storage_cmd', { passphrase });
          setStoredKeys(loadedKeys);
          showToast('success', 'Keys loaded', `Loaded ${loadedKeys.length} keypair(s)`);
          console.log(`Auto-loaded ${loadedKeys.length} keypair(s) on startup`);
        }
      } catch (err) {
        console.error('Failed to auto-load stored keys on startup:', err);
      }
    };

    autoLoadStoredKeys();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            toast={toast}
            onClose={removeToast}
          />
        ))}
      </div>

      {/* Header */}
      <header className="bg-slate-900 dark:bg-slate-950 border-b border-slate-800 px-8 py-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Age File Encryption Tool</h1>
          <p className="text-sm text-slate-400">Cross-platform file encryption using age</p>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Content with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-56 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-sm flex flex-col transition-colors duration-200">
          <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
            {tabs.filter(tab => tab.id !== 'about').map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-3 rounded-r-lg transition-all duration-200 border-l-4 ${activeTab === tab.id
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium border-blue-500'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{tab.icon}</span>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">{tab.label}</div>
                    <div className="text-xs opacity-75 truncate">{tab.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </nav>
          {/* About Tab - Sticky to Bottom */}
          <nav className="border-t border-slate-200 dark:border-slate-800 p-4">
            {tabs.filter(tab => tab.id === 'about').map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-3 rounded-r-lg transition-all duration-200 border-l-4 ${activeTab === tab.id
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium border-blue-500'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{tab.icon}</span>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">{tab.label}</div>
                    <div className="text-xs opacity-75 truncate">{tab.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
          <div className="max-w-6xl mx-auto p-8">
            {activeTab === 'keys' && <KeyManagementTab />}
            {activeTab === 'encrypt' && <EncryptionTab />}
            {activeTab === 'decrypt' && <DecryptionTab />}
            {activeTab === 'about' && <AboutTab />}
          </div>
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <EncryptionStateProvider>
      <AppContent />
    </EncryptionStateProvider>
  );
}
