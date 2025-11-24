import React, { useState } from 'react';
import { KeyManagementTab } from './KeyManagementTab';
import { EncryptionTab } from './EncryptionTab';
import { DecryptionTab } from './DecryptionTab';

type TabType = 'keys' | 'encrypt' | 'decrypt';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('keys');

  const tabs = [
    { id: 'keys' as const, label: 'Key Management', description: 'Generate and manage age keys' },
    { id: 'encrypt' as const, label: 'Encrypt Files', description: 'Encrypt files with public keys' },
    { id: 'decrypt' as const, label: 'Decrypt Files', description: 'Decrypt files with private keys' },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <h1>Age File Encryption Tool</h1>
        <p>Cross-platform file encryption using age</p>
      </header>

      <nav className="tab-navigation">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <div className="tab-label">{tab.label}</div>
            <div className="tab-description">{tab.description}</div>
          </button>
        ))}
      </nav>

      <main className="tab-content">
        {activeTab === 'keys' && <KeyManagementTab />}
        {activeTab === 'encrypt' && <EncryptionTab />}
        {activeTab === 'decrypt' && <DecryptionTab />}
      </main>
    </div>
  );
}
