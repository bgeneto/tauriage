import React, { useState, useEffect } from 'react';
import { useAgeOperations } from '../hooks/useAge';
import { useKeyStore } from '../hooks/useKeyStore';
import { AgeKeyPair, StoredKey } from '../types';

export function KeyManagementTab() {
  // Key generation state
  const [comment, setComment] = useState('');
  const [generatedKey, setGeneratedKey] = useState<AgeKeyPair | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // SSH key import state
  const [sshKey, setSshKey] = useState('');
  const [isPasting, setIsPasting] = useState(false);

  // Key storage state
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

  // Check for existing key storage on mount
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
      setError(err instanceof Error ? err.message : 'Failed to generate keys');
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
    <div className="tab-panel">
      <h2>Key Management</h2>
      <p>Generate age key pairs, import SSH keys, and manage your stored keys.</p>

      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="column" style={{ gap: '2rem' }}>
        {/* Key generation section */}
        <div className="key-generation-section">
          <h3>Generate New Keys</h3>
          <div className="row">
            <input
              type="text"
              placeholder="Optional comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              onClick={handleGenerateKeys}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate Keys'}
            </button>
          </div>
        </div>

        {/* Generated key display */}
        {generatedKey && (
          <div className="generated-keys">
            <h4>Generated Key Pair</h4>
            <div className="column" style={{ gap: '1rem' }}>
              <div>
                <label>Public Key:</label>
                <div className="row">
                  <textarea
                    readOnly
                    value={generatedKey.publicKey}
                    style={{ flex: 1, minHeight: '60px', resize: 'vertical' }}
                  />
                  <button
                    onClick={() => copyToClipboard(generatedKey.publicKey)}
                    style={{ height: 'auto' }}
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div>
                <label>Private Key:</label>
                <div className="row">
                  <textarea
                    readOnly
                    value={generatedKey.privateKey}
                    style={{ flex: 1, minHeight: '80px', resize: 'vertical', fontFamily: 'monospace' }}
                  />
                  <button
                    onClick={() => copyToClipboard(generatedKey.privateKey)}
                    style={{ height: 'auto' }}
                  >
                    Copy
                  </button>
                </div>
                <div className="button-group" style={{ marginTop: '0.5rem' }}>
                  <button onClick={handleStoreGeneratedKey}>
                    Store This Key
                  </button>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#666' }}>
                  ⚠️ Keep this private key secure! Never share it.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SSH key import section */}
        <div className="ssh-import-section">
          <h3>Import SSH Public Key</h3>
          <div className="row">
            <button
              onClick={handlePasteSshKey}
              disabled={isPasting}
            >
              {isPasting ? 'Pasting...' : 'Paste from Clipboard'}
            </button>
            <span className="help-text">Supports SSH RSA, Ed25519 keys</span>
          </div>

          {sshKey && (
            <div style={{ marginTop: '1rem' }}>
              <label>SSH Key:</label>
              <textarea
                readOnly
                value={sshKey}
                style={{ width: '100%', minHeight: '60px', resize: 'vertical', fontFamily: 'monospace' }}
              />
            </div>
          )}
        </div>

        {/* Key storage section */}
        <div className="stored-keys-section">
          <h3>Key Storage</h3>
          {!showKeyStore ? (
            <div className="column" style={{ gap: '1rem' }}>
              <p>Enter passphrase to access or create key storage:</p>
              <div className="row">
                <input
                  type="password"
                  placeholder="Enter passphrase"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  onClick={handleLoadKeyStorage}
                  disabled={isLoadingKeys || !passphrase.trim()}
                >
                  {isLoadingKeys ? 'Loading...' : 'Load Keys'}
                </button>
              </div>
            </div>
          ) : (
            <div className="column" style={{ gap: '1rem' }}>
              <div className="row">
                <h4>Passphrase:</h4>
                <input
                  type="password"
                  placeholder="Enter passphrase to save"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  onClick={handleSaveKeyStorage}
                  disabled={isSavingKeys || !passphrase.trim() || storedKeys.length === 0}
                >
                  {isSavingKeys ? 'Saving...' : 'Save Keys'}
                </button>
              </div>

              <div>
                <h4>Stored Keys ({storedKeys.length}):</h4>
                {storedKeys.length === 0 ? (
                  <p>No keys stored yet. Add some keys above to get started.</p>
                ) : (
                  <div className="column" style={{ gap: '1rem' }}>
                    {storedKeys.map((key, index) => (
                      <div key={key.id} className="stored-key-item" style={{
                        padding: '1rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}>
                        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                          <h5>{key.name}</h5>
                          <button
                            onClick={() => handleRemoveStoredKey(index)}
                            style={{ backgroundColor: '#dc3545' }}
                          >
                            Remove
                          </button>
                        </div>
                        <div className="row">
                          <textarea
                            readOnly
                            value={key.publicKey}
                            placeholder="Public key"
                            style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.875rem' }}
                          />
                          <button
                            onClick={() => copyToClipboard(key.publicKey)}
                            style={{ height: 'auto' }}
                          >
                            Copy Pub
                          </button>
                        </div>
                        {key.privateKey && (
                          <div className="row" style={{ marginTop: '0.5rem' }}>
                            <textarea
                              readOnly
                              value={key.privateKey}
                              placeholder="Private key"
                              style={{
                                flex: 1,
                                fontFamily: 'monospace',
                                fontSize: '0.875rem',
                                minHeight: '60px',
                                resize: 'vertical'
                              }}
                            />
                            <button
                              onClick={() => copyToClipboard(key.privateKey!)}
                              style={{ height: 'auto', backgroundColor: '#fd7e14' }}
                            >
                              Copy Priv
                            </button>
                          </div>
                        )}
                        {key.comment && (
                          <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>
                            {key.comment}
                          </p>
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
    </div>
  );
}
