import { useState } from 'react';
import { KeyManagementTab } from './KeyManagementTab';
import { EncryptionTab } from './EncryptionTab';
import { DecryptionTab } from './DecryptionTab';

type TabType = 'keys' | 'encrypt' | 'decrypt';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('keys');

  const tabs = [
    { id: 'keys' as const, label: 'Key Management', description: 'Generate and manage age keys', icon: '🔑' },
    { id: 'encrypt' as const, label: 'Encrypt', description: 'Encrypt files', icon: '🔒' },
    { id: 'decrypt' as const, label: 'Decrypt', description: 'Decrypt files', icon: '🔓' },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-6 shadow-lg">
        <h1 className="text-3xl font-bold mb-1">Age File Encryption Tool</h1>
        <p className="text-sm opacity-90">Cross-platform file encryption using age</p>
      </header>

      {/* Main Content with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-56 bg-white border-r border-slate-200 shadow-sm overflow-y-auto">
          <nav className="p-4 space-y-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-indigo-100 text-indigo-700 border-l-4 border-indigo-500'
                    : 'text-slate-700 hover:bg-slate-100'
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
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-8">
            {activeTab === 'keys' && <KeyManagementTab />}
            {activeTab === 'encrypt' && <EncryptionTab />}
            {activeTab === 'decrypt' && <DecryptionTab />}
          </div>
        </main>
      </div>
    </div>
  );
}
