import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAgeOperations } from '../hooks/useAge';
import { useKeyStore } from '../hooks/useKeyStore';
import Toast, { ToastMessage } from './Toast';
import { useEncryptionState } from '../context/EncryptionStateContext';

export function KeyManagementTab() {
  const [isGenerating, setIsGenerating] = useState(false);

  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(true); // Starts unlocked with auto-passphrase

  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [autoPassphrase, setAutoPassphrase] = useState<string | null>(null);

  const { generateKeys } = useAgeOperations();
  const { saveKeyStorage, createStoredKey, loadKeyStorage, keyStorageExists } = useKeyStore();
  const { 
    keyManagement: { generatedKey, keyName, storedKeys },
    setGeneratedKey,
    setKeyName,
    setStoredKeys,
    removeStoredKey,
    addEncryptionRecipient, 
    setDecryptionIdentity 
  } = useEncryptionState();

  const showToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('success', 'Copied to clipboard!');
    } catch (err) {
      showToast('error', 'Failed to copy', 'Could not copy to clipboard');
    }
  };

  // Initialize auto-passphrase and load keys on mount
  useEffect(() => {
    const initializeKeyStorage = async () => {
      try {
        // Get or create the auto-passphrase
        const passphrase = await invoke<string>('get_or_create_passphrase_cmd');
        setAutoPassphrase(passphrase);

        // Check if key storage exists
        const exists = await keyStorageExists();
        if (exists) {
          // Auto-load the stored keys
          const loadedKeys = await loadKeyStorage(passphrase);
          setStoredKeys(loadedKeys);
          // Don't show toast here - keys already loaded at app startup
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to initialize key storage';
        console.error('Key storage initialization error:', errorMsg);
        setError(errorMsg);
      } finally {
        setIsLoadingKeys(false);
      }
    };

    initializeKeyStorage();
  }, []);

  const handleGenerateKeys = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const keyPair = await generateKeys(undefined);
      setGeneratedKey(keyPair);
      setKeyName('');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate keys';
      console.error('Key generation error:', errorMsg);
      setError(errorMsg);
      setGeneratedKey(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStoreGeneratedKey = async () => {
    if (!generatedKey) return;
    if (!keyName.trim()) {
      showToast('warning', 'Name required', 'Please enter a name for this key');
      return;
    }

    if (!autoPassphrase) {
      showToast('error', 'Passphrase not ready', 'Auto-passphrase not initialized');
      return;
    }

    try {
      const storedKey = await createStoredKey(
        keyName.trim(),
        generatedKey.publicKey,
        generatedKey.privateKey,
        generatedKey.comment
      );

      const newStoredKeys = [...storedKeys, storedKey];
      setStoredKeys(newStoredKeys);
      
      // Auto-save to encrypted storage with the auto-passphrase
      try {
        await saveKeyStorage(autoPassphrase, newStoredKeys);
        showToast('success', 'Key stored & saved!', `${keyName.trim()} has been saved to encrypted storage`);
      } catch (saveErr) {
        // Still show success for context state, but warn about encryption save
        showToast('warning', 'Key stored but not encrypted', 'Failed to save to encrypted storage, key is in memory only');
        console.error('Failed to save to encrypted storage:', saveErr);
      }
      
      setGeneratedKey(null);
      setKeyName('');
    } catch (error) {
      showToast('error', 'Failed to store key');
    }
  };

  const handleDeleteKey = (index: number) => {
    const keyToDelete = storedKeys[index];
    setDeleteConfirm(keyToDelete.id);
  };

  const confirmDelete = (index: number) => {
    removeStoredKey(index);
    setDeleteConfirm(null);
    showToast('success', 'Key deleted');
  };

  const handleUsePublicKey = (publicKey: string, keyName: string) => {
    addEncryptionRecipient(publicKey);
    showToast('success', 'Recipient added', `${keyName} added to encryption recipients`);
  };

  const handleUsePrivateKey = (privateKey: string, keyName: string) => {
    setDecryptionIdentity(privateKey);
    showToast('success', 'Private key loaded', `${keyName} ready for decryption`);
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setStoredKeys([]);
    showToast('info', 'Keypairs locked', 'Your keypairs are no longer in memory');
  };

  return (
    <div className="space-y-6">
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

      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Key Management</h2>
        <p className="text-slate-600">Generate age key pairs and manage your stored keys.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>{error}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generate New Keys */}
        <div className="bg-white rounded-lg p-6 border border-slate-200 flex flex-col">
          <div className="grow">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">🔑 Generate New Keys</h3>
            <p className="text-sm text-slate-600">Create a new age key pair for encryption and decryption.</p>
          </div>
          <button
            onClick={handleGenerateKeys}
            disabled={isGenerating}
            style={{ color: '#000000' }}
            className="mt-6 w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors text-base shadow-md hover:shadow-lg disabled:shadow-none flex items-center justify-center whitespace-nowrap"
          >
            {isGenerating ? '⏳ Generating...' : '🔑 Generate New Keys'}
          </button>
        </div>
      </div>

      {/* Generated Key Display */}
      {generatedKey && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Generated Key Pair</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-blue-900">Key Name</label>
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g., My Personal Key, Work Key..."
                className="w-full px-3 py-2 bg-white border border-blue-300 rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-blue-900">Public Key</label>
              <div className="flex gap-2">
                <textarea
                  readOnly
                  value={generatedKey.publicKey}
                  className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded font-mono text-xs text-slate-700"
                  rows={3}
                />
                <button
                  onClick={() => copyToClipboard(generatedKey.publicKey)}
                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors text-sm font-medium"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-blue-900">Private Key</label>
              <div className="flex gap-2">
                <textarea
                  readOnly
                  value={generatedKey.privateKey}
                  className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded font-mono text-xs text-slate-700"
                  rows={4}
                />
                <button
                  onClick={() => copyToClipboard(generatedKey.privateKey)}
                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors text-sm font-medium"
                >
                  Copy
                </button>
              </div>
              <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-800 text-xs">
                🔒 Keep this private key secure! Never share it.
              </div>
            </div>

            <button
              onClick={handleStoreGeneratedKey}
              disabled={!keyName.trim()}
              className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              💾 Store This Key
            </button>
          </div>
        </div>
      )}

      {/* Key Storage Management */}
      <div className="bg-white rounded-lg p-6 border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">🗝️ Stored Key Pairs ({storedKeys.length})</h3>
          {isUnlocked && (
            <button
              onClick={handleLock}
              className="px-3 py-1 bg-slate-500 hover:bg-slate-600 text-white rounded text-xs font-medium transition-colors"
            >
              🔒 Lock
            </button>
          )}
        </div>

        {isLoadingKeys ? (
          <p className="text-slate-500 text-sm italic py-4">Loading your keypairs...</p>
        ) : storedKeys.length === 0 ? (
          <p className="text-slate-500 text-sm italic py-4">No keys stored yet. Generate and store keys to use them in encryption and decryption.</p>
        ) : (
          <div className="space-y-3">
            {storedKeys.map((key, index) => (
              <div key={key.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-900">{key.name}</h4>
                  <button
                    onClick={() => handleDeleteKey(index)}
                    className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>

                {deleteConfirm === key.id && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 flex items-center justify-between gap-2">
                    <span className="text-sm text-red-800">Delete this key pair permanently?</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => confirmDelete(index)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1 bg-slate-400 hover:bg-slate-500 text-white rounded text-xs font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Public Key */}
                <div>
                  <div className="text-xs font-medium text-slate-600 mb-1">Public Key</div>
                  <div className="flex gap-2">
                    <textarea
                      readOnly
                      value={key.publicKey}
                      className="flex-1 px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs text-slate-700"
                      rows={2}
                    />
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => copyToClipboard(key.publicKey)}
                        className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors whitespace-nowrap"
                        title="Copy to clipboard"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => handleUsePublicKey(key.publicKey, key.name)}
                        className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs font-medium transition-colors whitespace-nowrap"
                        title="Add as encryption recipient"
                      >
                        Use
                      </button>
                    </div>
                  </div>
                </div>

                {/* Private Key */}
                {key.privateKey && (
                  <div>
                    <div className="text-xs font-medium text-slate-600 mb-1">Private Key</div>
                    <div className="flex gap-2">
                      <textarea
                        readOnly
                        value={key.privateKey}
                        className="flex-1 px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs text-slate-700"
                        rows={3}
                      />
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => copyToClipboard(key.privateKey!)}
                          className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs font-medium transition-colors whitespace-nowrap"
                          title="Copy to clipboard"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => handleUsePrivateKey(key.privateKey!, key.name)}
                          className="px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded text-xs font-medium transition-colors whitespace-nowrap"
                          title="Load for decryption"
                        >
                          Use
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {key.comment && (
                  <p className="text-xs text-slate-500 italic">{key.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

