import React, { useState } from 'react';
import { useAgeOperations } from '../hooks/useAge';
import { FileExplorer, FileItem } from './FileExplorer';
import { pickSaveLocation } from '../utils/file';
import { EncryptionResult, StoredKey } from '../types';
import { useKeyStore } from '../hooks/useKeyStore';

export function EncryptionTab() {
  const [selectedInputFiles, setSelectedInputFiles] = useState<FileItem[]>([]);
  const [outputFile, setOutputFile] = useState<string>('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptionResult, setEncryptionResult] = useState<EncryptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { encryptFile } = useAgeOperations();
  const { loadKeyStorage } = useKeyStore();

  // Load stored keys to use as recipients
  const [storedKeys, setStoredKeys] = useState<StoredKey[]>([]);

  React.useEffect(() => {
    const loadStoredKeys = async () => {
      try {
        // For demo purposes, try loading with empty passphrase
        const keys = await loadKeyStorage('', undefined);
        setStoredKeys(keys);
      } catch (error) {
        // Stored keys not available, continue without
        console.log('No stored keys available');
      }
    };
    loadStoredKeys();
  }, [loadKeyStorage]);

  const handlePickOutputFile = async () => {
    if (selectedInputFiles.length === 0) {
      setError('Please select input files first');
      return;
    }

    const suggestedName = selectedInputFiles.length === 1
      ? `${selectedInputFiles[0].name}.age`
      : 'encrypted_files.age';

    const filePath = await pickSaveLocation('Choose encrypted file location', suggestedName);
    if (filePath) {
      setOutputFile(filePath);
    }
  };

  const handleAddRecipient = () => {
    const trimmedInput = recipientInput.trim();
    if (trimmedInput && !recipients.includes(trimmedInput)) {
      setRecipients([...recipients, trimmedInput]);
      setRecipientInput('');
    }
  };

  const handleRemoveRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const handleAddStoredKeyAsRecipient = (storedKey: StoredKey) => {
    if (!recipients.includes(storedKey.publicKey)) {
      setRecipients([...recipients, storedKey.publicKey]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddRecipient();
    }
  };

  const handleEncrypt = async () => {
    if (selectedInputFiles.length === 0 || !outputFile || recipients.length === 0) {
      setError('Please select input files, output file, and at least one recipient.');
      return;
    }

    setIsEncrypting(true);
    setError(null);
    setEncryptionResult(null);

    try {
      // For now, encrypt only the first file. Batch encryption would need more complex handling
      // TODO: Implement batch file encryption
      const result = await encryptFile(selectedInputFiles[0].path, outputFile, recipients);
      setEncryptionResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Encryption failed');
    } finally {
      setIsEncrypting(false);
    }
  };

  return (
    <div className="tab-panel">
      <h2>File Encryption</h2>
      <p>Select files to encrypt and choose public keys for recipients.</p>

      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="column" style={{ gap: '2rem' }}>
        {/* File Explorer for input selection */}
        <div>
          <h3>Step 1: Select Files to Encrypt</h3>
          <p>Browse and select files from your filesystem. <em>(Currently single file selection, batch support coming soon)</em></p>
          <FileExplorer
            selectionMode="single"
            selectedFiles={selectedInputFiles}
            onSelectionChange={setSelectedInputFiles}
            acceptedExtensions={[]} // Allow all files for encryption
          />
        </div>

        {/* Output file selection */}
        <div className="file-selection-section">
          <h3>Step 2: Choose Output Location</h3>
          <div className="row">
            <input
              type="text"
              value={outputFile}
              placeholder="Click 'Choose Location' to select where to save the encrypted file"
              readOnly
              style={{ flex: 1 }}
            />
            <button
              onClick={handlePickOutputFile}
              disabled={selectedInputFiles.length === 0}
            >
              Choose Location
            </button>
          </div>
        </div>

        {/* Recipients */}
        <div className="recipients-section">
          <h3>Step 3: Add Recipients (Public Keys)</h3>
          <p>Add public keys of people who should be able to decrypt this file.</p>

          {/* Stored keys section */}
          {storedKeys.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <p><strong>Your Saved Keys:</strong></p>
              <div className="row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                {storedKeys.map((key) => (
                  <button
                    key={key.id}
                    onClick={() => handleAddStoredKeyAsRecipient(key)}
                    disabled={recipients.includes(key.publicKey)}
                    style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                  >
                    Use: {key.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="row">
            <textarea
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Paste a public key here or enter an age recipient...&#10;&#10;Example: age1xyz..."
              style={{ flex: 1, minHeight: '100px', resize: 'vertical' }}
            />
            <button
              onClick={handleAddRecipient}
              disabled={!recipientInput.trim()}
            >
              Add Recipient
            </button>
          </div>

          {recipients.length > 0 && (
            <div className="recipients-list" style={{ marginTop: '1rem' }}>
              <h4>Selected Recipients ({recipients.length}):</h4>
              <div className="column" style={{ gap: '0.5rem' }}>
                {recipients.map((recipient, index) => (
                  <div key={index} className="row" style={{ alignItems: 'flex-start' }}>
                    <textarea
                      value={recipient}
                      readOnly
                      style={{
                        flex: 1,
                        minHeight: '60px',
                        resize: 'vertical',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem'
                      }}
                    />
                    <button
                      onClick={() => handleRemoveRecipient(index)}
                      style={{ height: 'auto', backgroundColor: '#dc3545' }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Encrypt button */}
        <div className="encryption-controls">
          <button
            onClick={handleEncrypt}
            disabled={isEncrypting || selectedInputFiles.length === 0 || !outputFile || recipients.length === 0}
            style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}
          >
            {isEncrypting ? '🔐 Encrypting...' : '🔐 Encrypt File'}
          </button>
        </div>

        {/* Results */}
        {encryptionResult && (
          <div className="encryption-result" style={{
            padding: '1rem',
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '4px'
          }}>
            <h4 style={{ color: '#155724', marginTop: 0 }}>✅ Encryption Successful!</h4>
            <div className="column" style={{ gap: '0.5rem' }}>
              <p><strong>📁 Input:</strong> {encryptionResult.inputFile}</p>
              <p><strong>💾 Output:</strong> {encryptionResult.outputFile}</p>
              <p><strong>👥 Recipients:</strong> {encryptionResult.publicKeys.length}</p>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#155724' }}>
              Your file has been securely encrypted with age. Keep your private key safe!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
