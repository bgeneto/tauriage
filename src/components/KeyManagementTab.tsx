import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';
import { useAgeOperations } from '../hooks/useAge';
import { useKeyStore } from '../hooks/useKeyStore';
import Toast, { ToastMessage } from './Toast';
import { useEncryptionState } from '../context/EncryptionStateContext';

export function KeyManagementTab() {
  const [isGenerating, setIsGenerating] = useState(false);

  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(true); // Starts unlocked with auto-passphrase
  const [expandedKeyId, setExpandedKeyId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [autoPassphrase, setAutoPassphrase] = useState<string | null>(null);
  const [editedPublicKey, setEditedPublicKey] = useState<string>('');
  const [editedPrivateKey, setEditedPrivateKey] = useState<string>('');

  // Export/Import dialog state
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [exportPassphraseConfirm, setExportPassphraseConfirm] = useState('');
  const [importPassphrase, setImportPassphrase] = useState('');
  const [importFilePath, setImportFilePath] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const { generateKeys } = useAgeOperations();
  const { saveKeyStorage, createStoredKey, loadKeyStorage, keyStorageExists, exportKeys, importKeys } = useKeyStore();
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
      setEditedPublicKey(keyPair.publicKey);
      setEditedPrivateKey(keyPair.privateKey);
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
        editedPublicKey,
        editedPrivateKey,
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
      setEditedPublicKey('');
      setEditedPrivateKey('');
    } catch (error) {
      showToast('error', 'Failed to store key');
    }
  };

  const handleDeleteKey = (index: number) => {
    const keyToDelete = storedKeys[index];
    setDeleteConfirm(keyToDelete.id);
  };

  const confirmDelete = async (index: number) => {
    removeStoredKey(index);
    setDeleteConfirm(null);

    // Get the updated keys list after deletion
    const updatedKeys = storedKeys.filter((_, i) => i !== index);

    // Save the updated keys to encrypted storage
    if (autoPassphrase) {
      try {
        await saveKeyStorage(autoPassphrase, updatedKeys);
        showToast('success', 'Key deleted and saved');
      } catch (err) {
        showToast('error', 'Key deleted but failed to save', 'Changes may be lost on restart');
        console.error('Failed to save after deletion:', err);
      }
    } else {
      showToast('success', 'Key deleted');
    }
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

  // Export handlers
  const handleExportClick = () => {
    if (storedKeys.length === 0) {
      showToast('warning', 'No keys to export', 'Generate and store some keys first');
      return;
    }
    setExportPassphrase('');
    setExportPassphraseConfirm('');
    setShowExportDialog(true);
  };

  const handleExportConfirm = async () => {
    if (exportPassphrase.length < 4) {
      showToast('warning', 'Passphrase too short', 'Use at least 4 characters');
      return;
    }
    if (exportPassphrase !== exportPassphraseConfirm) {
      showToast('error', 'Passphrases do not match');
      return;
    }

    setIsExporting(true);
    try {
      const filePath = await save({
        defaultPath: 'tauriage-keys-export.bin',
        filters: [{ name: 'TauriAge Export', extensions: ['bin'] }],
      });

      if (filePath) {
        await exportKeys(exportPassphrase, storedKeys, filePath);
        showToast('success', 'Keys exported!', `${storedKeys.length} key(s) saved to ${filePath}`);
        setShowExportDialog(false);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Export failed';
      showToast('error', 'Export failed', errorMsg);
    } finally {
      setIsExporting(false);
    }
  };

  // Import handlers
  const handleImportClick = async () => {
    try {
      const filePath = await open({
        filters: [{ name: 'TauriAge Export', extensions: ['bin'] }],
        multiple: false,
      });

      if (filePath && typeof filePath === 'string') {
        setImportFilePath(filePath);
        setImportPassphrase('');
        setShowImportDialog(true);
      }
    } catch (err) {
      showToast('error', 'Failed to select file');
    }
  };

  const handleImportConfirm = async () => {
    if (!importFilePath) {
      showToast('error', 'No file selected');
      return;
    }
    if (importPassphrase.length < 4) {
      showToast('warning', 'Enter the passphrase used during export');
      return;
    }

    setIsImporting(true);
    try {
      const importedKeys = await importKeys(importPassphrase, importFilePath);

      // Merge with existing keys (skip duplicates by id)
      const existingIds = new Set(storedKeys.map(k => k.id));
      const newKeys = importedKeys.filter(k => !existingIds.has(k.id));
      const mergedKeys = [...storedKeys, ...newKeys];

      setStoredKeys(mergedKeys);

      // Save merged keys to storage
      if (autoPassphrase) {
        await saveKeyStorage(autoPassphrase, mergedKeys);
      }

      showToast('success', 'Keys imported!', `${newKeys.length} new key(s) added (${importedKeys.length - newKeys.length} duplicate(s) skipped)`);
      setShowImportDialog(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Import failed';
      showToast('error', 'Import failed', errorMsg);
    } finally {
      setIsImporting(false);
    }
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
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Key Management</h2>
        <p className="text-slate-600 dark:text-slate-400">Generate age key pairs and manage your stored keys.</p>
      </div>

      {error && (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 px-4 py-3 rounded-lg flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>{error}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generate New Keys */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-800 flex flex-col transition-colors duration-200">
          <div className="grow">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">🔑 Generate New Keys</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Create a new age key pair for encryption and decryption.</p>
          </div>
          <button
            onClick={handleGenerateKeys}
            disabled={isGenerating}
            style={{ color: '#ffffff' }}
            className="mt-6 w-full px-6 py-3 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 disabled:bg-slate-300 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors text-base shadow-sm hover:shadow-md disabled:shadow-none flex items-center justify-center whitespace-nowrap"
          >
            {isGenerating ? '⏳ Generating...' : '🔑 Generate New Keys'}
          </button>
        </div>
      </div>

      {/* Generated Key Display */}
      {generatedKey && (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 transition-colors duration-200">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Generated Key Pair</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Key Name</label>
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g., My Personal Key, Work Key..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Public Key</label>
              <div className="flex gap-2">
                <textarea
                  value={editedPublicKey}
                  onChange={(e) => setEditedPublicKey(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded font-mono text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 transition-colors"
                  rows={3}
                />
                <button
                  onClick={() => copyToClipboard(editedPublicKey)}
                  className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded transition-colors text-sm font-medium"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Private Key</label>
              <div className="flex gap-2">
                <textarea
                  value={editedPrivateKey}
                  onChange={(e) => setEditedPrivateKey(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded font-mono text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 transition-colors"
                  rows={4}
                />
                <button
                  onClick={() => copyToClipboard(editedPrivateKey)}
                  className="px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded transition-colors text-sm font-medium"
                >
                  Copy
                </button>
              </div>
              <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-400 text-xs transition-colors">
                🔒 Keep this private key secure! Never share it.
              </div>
            </div>

            <button
              onClick={handleStoreGeneratedKey}
              disabled={!keyName.trim()}
              className="w-full px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 disabled:bg-slate-300 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              💾 Store This Key
            </button>
          </div>
        </div>
      )}

      {/* Key Storage Management */}
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-800 space-y-4 transition-colors duration-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">🗝️ Stored Key Pairs ({storedKeys.length})</h3>
          <div className="flex gap-2">
            <button
              onClick={handleImportClick}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded text-xs font-medium transition-colors"
            >
              📥 Import
            </button>
            <button
              onClick={handleExportClick}
              disabled={storedKeys.length === 0}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-300 dark:disabled:bg-slate-700/50 disabled:cursor-not-allowed text-white rounded text-xs font-medium transition-colors"
            >
              📤 Export
            </button>
            {isUnlocked && (
              <button
                onClick={handleLock}
                className="px-3 py-1 bg-slate-500 hover:bg-slate-600 text-white rounded text-xs font-medium transition-colors"
              >
                🔒 Lock
              </button>
            )}
          </div>
        </div>

        {isLoadingKeys ? (
          <p className="text-slate-500 dark:text-slate-400 text-sm italic py-4">Loading your keypairs...</p>
        ) : storedKeys.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 text-sm italic py-4">No keys stored yet. Generate and store keys to use them in encryption and decryption.</p>
        ) : (
          <div className="space-y-2">
            {storedKeys.map((key, index) => {
              const isExpanded = expandedKeyId === key.id;
              return (
                <div key={key.id} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden transition-colors">
                  {/* Accordion Header */}
                  <button
                    onClick={() => setExpandedKeyId(isExpanded ? null : key.id)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-lg text-slate-900 dark:text-white">{isExpanded ? '▼' : '▶'}</span>
                      <h4 className="font-semibold text-slate-900 dark:text-white">{key.name}</h4>
                      <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">
                        {key.privateKey ? '🔐 Full' : '🔒 Public only'}
                      </span>
                    </div>
                  </button>

                  {/* Accordion Content */}
                  {isExpanded && (
                    <div className="px-4 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 space-y-3 transition-colors">
                      {/* Delete Button - Always visible in expanded view */}
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleDeleteKey(index)}
                          className="px-3 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-medium transition-colors"
                        >
                          🗑️ Delete
                        </button>
                      </div>

                      {deleteConfirm === key.id && (
                        <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-3 flex items-center justify-between gap-2 transition-colors">
                          <span className="text-sm text-slate-700 dark:text-slate-300">Delete this key pair permanently?</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => confirmDelete(index)}
                              className="px-3 py-1 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded text-xs font-medium transition-colors"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-3 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-medium transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Public Key */}
                      <div>
                        <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Public Key</div>
                        <div className="flex gap-2">
                          <textarea
                            readOnly
                            value={key.publicKey}
                            className="flex-1 px-2 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded font-mono text-xs text-slate-700 dark:text-slate-300 transition-colors"
                            rows={2}
                          />
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => copyToClipboard(key.publicKey)}
                              className="px-2 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-medium transition-colors whitespace-nowrap"
                              title="Copy to clipboard"
                            >
                              Copy
                            </button>
                            <button
                              onClick={() => handleUsePublicKey(key.publicKey, key.name)}
                              className="px-2 py-1 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded text-xs font-medium transition-colors whitespace-nowrap"
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
                          <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Private Key</div>
                          <div className="flex gap-2">
                            <textarea
                              readOnly
                              value={key.privateKey}
                              className="flex-1 px-2 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded font-mono text-xs text-slate-700 dark:text-slate-300 transition-colors"
                              rows={3}
                            />
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => copyToClipboard(key.privateKey!)}
                                className="px-2 py-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-medium transition-colors whitespace-nowrap"
                                title="Copy to clipboard"
                              >
                                Copy
                              </button>
                              <button
                                onClick={() => handleUsePrivateKey(key.privateKey!, key.name)}
                                className="px-2 py-1 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded text-xs font-medium transition-colors whitespace-nowrap"
                                title="Load for decryption"
                              >
                                Use
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {key.comment && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">{key.comment}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-md mx-4 shadow-xl border border-slate-200 dark:border-slate-800 transition-colors">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">📤 Export Keys</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Enter a passphrase to protect your exported keys. You will need this passphrase to import the keys on another machine.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Passphrase</label>
                <input
                  type="password"
                  value={exportPassphrase}
                  onChange={(e) => setExportPassphrase(e.target.value)}
                  placeholder="Enter a passphrase (min 4 chars)"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm Passphrase</label>
                <input
                  type="password"
                  value={exportPassphraseConfirm}
                  onChange={(e) => setExportPassphraseConfirm(e.target.value)}
                  placeholder="Confirm passphrase"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 transition-colors"
                />
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button
                  onClick={() => setShowExportDialog(false)}
                  className="px-4 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExportConfirm}
                  disabled={isExporting || exportPassphrase.length < 4 || exportPassphrase !== exportPassphraseConfirm}
                  className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 disabled:bg-slate-300 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {isExporting ? '⏳ Exporting...' : '📤 Export'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-md mx-4 shadow-xl border border-slate-200 dark:border-slate-800 transition-colors">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">📥 Import Keys</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Selected file: <span className="font-mono text-xs">{importFilePath.split(/[/\\]/).pop()}</span>
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Enter the passphrase that was used when exporting these keys.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Passphrase</label>
                <input
                  type="password"
                  value={importPassphrase}
                  onChange={(e) => setImportPassphrase(e.target.value)}
                  placeholder="Enter export passphrase"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 transition-colors"
                />
              </div>
              <div className="flex gap-2 justify-end mt-6">
                <button
                  onClick={() => setShowImportDialog(false)}
                  className="px-4 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportConfirm}
                  disabled={isImporting || importPassphrase.length < 4}
                  className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 disabled:bg-slate-300 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  {isImporting ? '⏳ Importing...' : '📥 Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
