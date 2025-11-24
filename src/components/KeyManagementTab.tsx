import { useState, useEffect } from 'react';
import { useAgeOperations } from '../hooks/useAge';
import { useKeyStore } from '../hooks/useKeyStore';
import { AgeKeyPair, StoredKey } from '../types';

export function KeyManagementTab() {
  const [comment, setComment] = useState('');
  const [generatedKey, setGeneratedKey] = useState<AgeKeyPair | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [sshKey, setSshKey] = useState('');
  const [isPasting, setIsPasting] = useState(false);

  const [storedKeys, setStoredKeys] = useState<StoredKey[]>([]);
  const [passphrase, setPassphrase] = useState('');
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [isSavingKeys, setIsSavingKeys] = useState(false);
  const [showKeyStore, setShowKeyStore] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const { generateKeys, pasteSshKey } = useAgeOperations();
  const {
    keyStorageExists,
    loadKeyStorage,
    saveKeyStorage,
    createStoredKey
  } = useKeyStore();

  useEffect(() => {
    const checkExistingStorage = async () => {
      try {
        const exists = await keyStorageExists();
        if (exists) {
          setShowKeyStore(true);
        }
      } catch (error) {
        console.error('Failed to check key storage:', error);
      }
    };

    checkExistingStorage();
  }, [keyStorageExists]);

  const handleGenerateKeys = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const keyPair = await generateKeys(comment || undefined);
      setGeneratedKey(keyPair);
      setComment('');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate keys';
      console.error('Key generation error:', errorMsg);
      setError(errorMsg);
      setGeneratedKey(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePasteSshKey = async () => {
    setIsPasting(true);
    setError(null);

    try {
      const pastedKey = await pasteSshKey();
      setSshKey(pastedKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to paste SSH key');
    } finally {
      setIsPasting(false);
    }
  };

  const handleStoreGeneratedKey = async () => {
    if (!generatedKey) return;

    const keyName = prompt('Enter a name for this key:');
    if (!keyName?.trim()) return;

    try {
      const storedKey = await createStoredKey(
        keyName.trim(),
        generatedKey.publicKey,
        generatedKey.privateKey,
        generatedKey.comment
      );

      setStoredKeys(prev => [...prev, storedKey]);
    } catch (error) {
      setError('Failed to store key');
    }
  };

  const handleLoadKeyStorage = async () => {
    if (!passphrase.trim()) {
      setError('Please enter a passphrase');
      return;
    }

    setIsLoadingKeys(true);
    setError(null);

    try {
      const keys = await loadKeyStorage(passphrase);
      setStoredKeys(keys);
      setShowKeyStore(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load key storage');
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const handleSaveKeyStorage = async () => {
    if (!passphrase.trim()) {
      setError('Please enter a passphrase');
      return;
    }

    if (storedKeys.length === 0) {
      setError('No keys to save');
      return;
    }

    setIsSavingKeys(true);
    setError(null);

    try {
      await saveKeyStorage(passphrase, storedKeys);
      setShowKeyStore(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save key storage');
    } finally {
      setIsSavingKeys(false);
    }
  };

  const handleRemoveStoredKey = (index: number) => {
    setStoredKeys(prev => prev.filter((_, i) => i !== index));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  return (
    <div className="space-y-6">
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
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">🔑 Generate New Keys</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Optional comment for these keys"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={handleGenerateKeys}
              disabled={isGenerating}
              className="w-full px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isGenerating ? '⏳ Generating...' : '🔄 Generate Keys'}
            </button>
          </div>
        </div>

        {/* SSH Key Import */}
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">📋 Import SSH Key</h3>
          <div className="space-y-3">
            <button
              onClick={handlePasteSshKey}
              disabled={isPasting}
              className="w-full px-4 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 rounded-lg font-medium transition-colors"
            >
              {isPasting ? '⏳ Pasting...' : '📌 Paste from Clipboard'}
            </button>
            <p className="text-xs text-slate-500">Supports SSH RSA, Ed25519 keys</p>
          </div>
        </div>
      </div>

      {/* Generated Key Display */}
      {generatedKey && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Generated Key Pair</h3>
          <div className="space-y-4">
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
              className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
            >
              💾 Store This Key
            </button>
          </div>
        </div>
      )}

      {/* SSH Key Display */}
      {sshKey && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Pasted SSH Key</h3>
          <div className="flex gap-2">
            <textarea
              readOnly
              value={sshKey}
              className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded font-mono text-xs text-slate-700"
              rows={6}
            />
            <button
              onClick={() => copyToClipboard(sshKey)}
              className="px-3 py-2 bg-slate-400 hover:bg-slate-500 text-white rounded transition-colors text-sm font-medium"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Key Storage */}
      <div className="bg-white rounded-lg p-6 border border-slate-200 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">🗝️ Key Storage</h3>

        {!showKeyStore ? (
          <div className="space-y-3">
            <p className="text-slate-600 text-sm">Enter passphrase to access or create key storage:</p>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Enter passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={handleLoadKeyStorage}
                disabled={isLoadingKeys || !passphrase.trim()}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {isLoadingKeys ? '⏳ Loading...' : 'Load'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={handleSaveKeyStorage}
                disabled={isSavingKeys || !passphrase.trim() || storedKeys.length === 0}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {isSavingKeys ? '⏳ Saving...' : '💾 Save'}
              </button>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-3">Stored Keys ({storedKeys.length})</h4>
              {storedKeys.length === 0 ? (
                <p className="text-slate-500 text-sm italic">No keys stored yet</p>
              ) : (
                <div className="space-y-3">
                  {storedKeys.map((key, index) => (
                    <div key={key.id} className="bg-slate-50 border border-slate-200 rounded p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-semibold text-slate-900">{key.name}</h5>
                        <button
                          onClick={() => handleRemoveStoredKey(index)}
                          className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium transition-colors"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <textarea
                            readOnly
                            value={key.publicKey}
                            className="flex-1 px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs text-slate-700"
                            rows={2}
                          />
                          <button
                            onClick={() => copyToClipboard(key.publicKey)}
                            className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors"
                          >
                            Pub
                          </button>
                        </div>

                        {key.privateKey && (
                          <div className="flex gap-2">
                            <textarea
                              readOnly
                              value={key.privateKey}
                              className="flex-1 px-2 py-1 bg-white border border-slate-300 rounded font-mono text-xs text-slate-700"
                              rows={3}
                            />
                            <button
                              onClick={() => copyToClipboard(key.privateKey!)}
                              className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs font-medium transition-colors"
                            >
                              Priv
                            </button>
                          </div>
                        )}
                      </div>

                      {key.comment && (
                        <p className="text-xs text-slate-500 mt-2 italic">{key.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

