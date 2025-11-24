import React, { useState } from 'react';
import { useAgeOperations } from '../hooks/useAge';
import { FileExplorer, FileItem } from './FileExplorer';
import { pickSaveLocation } from '../utils/file';
import { DecryptionResult, StoredKey } from '../types';
import { useKeyStore } from '../hooks/useKeyStore';

export function DecryptionTab() {
  const [selectedInputFiles, setSelectedInputFiles] = useState<FileItem[]>([]);
  const [outputFile, setOutputFile] = useState<string>('');
  const [identity, setIdentity] = useState<string>('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptionResult, setDecryptionResult] = useState<DecryptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { decryptFile } = useAgeOperations();
  const { loadKeyStorage } = useKeyStore();

  // Load stored keys to potentially use as identities
  const [storedKeys, setStoredKeys] = useState<StoredKey[]>([]);

  React.useEffect(() => {
    const loadStoredKeys = async () => {
      try {
        const keys = await loadKeyStorage('', undefined);
        setStoredKeys(keys);
      } catch (error) {
        // Stored keys not available, continue without
        console.log('No stored keys available for decryption');
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
      ? (selectedInputFiles[0].name.endsWith('.age')
          ? selectedInputFiles[0].name.slice(0, -4)
          : `${selectedInputFiles[0].name}.decrypted`)
      : 'decrypted_files';

    const filePath = await pickSaveLocation('Choose decrypted file location', suggestedName);
    if (filePath) {
      setOutputFile(filePath);
    }
  };

  const handleUseStoredKey = (storedKey: StoredKey) => {
    if (storedKey.privateKey) {
      setIdentity(storedKey.privateKey);
    }
  };

  const handleDecrypt = async () => {
    if (selectedInputFiles.length === 0 || !outputFile || !identity.trim()) {
      setError('Please select input files, output file, and provide a private key.');
      return;
    }

    setIsDecrypting(true);
    setError(null);
    setDecryptionResult(null);

    try {
      // For now, decrypt only the first file
      const result = await decryptFile(selectedInputFiles[0].path, outputFile, identity.trim());
      setDecryptionResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decryption failed');
    } finally {
      setIsDecrypting(false);
    }
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
      <h2>File Decryption</h2>
      <p>Select encrypted files and provide private keys for decryption.</p>

      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="column" style={{ gap: '2rem' }}>
        {/* File Explorer for input selection */}
        <div>
          <h3>Step 1: Select Encrypted Files</h3>
          <p>Browse and select .age encrypted files from your filesystem.</p>
          <FileExplorer
            selectionMode="single"
            selectedFiles={selectedInputFiles}
            onSelectionChange={setSelectedInputFiles}
            acceptedExtensions={['.age']} // Only show .age files
          />
        </div>

        {/* Output file selection */}
        <div className="file-selection-section">
          <h3>Step 2: Choose Output Location</h3>
          <div className="row">
            <input
              type="text"
              value={outputFile}
              placeholder="Click 'Choose Location' to select where to save the decrypted file"
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

        {/* Private key input */}
        <div className="identity-section">
          <h3>Step 3: Provide Private Key (Identity)</h3>

          {/* Stored keys section */}
          {storedKeys.length > 0 && storedKeys.some(k => k.privateKey) && (
            <div style={{ marginBottom: '1rem' }}>
              <p><strong>Your Saved Private Keys:</strong></p>
              <div className="row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                {storedKeys
                  .filter(key => key.privateKey)
                  .map((key) => (
                  <button
                    key={key.id}
                    onClick={() => handleUseStoredKey(key)}
                    style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                  >
                    Use: {key.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p>Paste your private key to decrypt the file:</p>

          <div className="row">
            <textarea
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              placeholder="Paste your private key here...&#10;&#10;Example: AGE-SECRET-KEY-..."
              style={{
                flex: 1,
                minHeight: '120px',
                resize: 'vertical',
                fontFamily: 'monospace',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={() => copyToClipboard(identity)}
              disabled={!identity.trim()}
              style={{ backgroundColor: '#6c757d' }}
            >
              Copy Key
            </button>
            <span style={{ fontSize: '0.875rem', color: '#666' }}>
              🔐 Your private key is kept in memory only and never stored
            </span>
          </div>
        </div>

        {/* Decrypt button */}
        <div className="decryption-controls">
          <button
            onClick={handleDecrypt}
            disabled={isDecrypting || selectedInputFiles.length === 0 || !outputFile || !identity.trim()}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              backgroundColor: '#28a745'
            }}
          >
            {isDecrypting ? '🔓 Decrypting...' : '🔓 Decrypt File'}
          </button>
        </div>

        {/* Results */}
        {decryptionResult && (
          <div className="decryption-result" style={{
            padding: '1rem',
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '4px'
          }}>
            <h4 style={{ color: '#155724', marginTop: 0 }}>✅ Decryption Successful!</h4>
            <div className="column" style={{ gap: '0.5rem' }}>
              <p><strong>🔐 Input:</strong> {decryptionResult.inputFile}</p>
              <p><strong>📂 Output:</strong> {decryptionResult.outputFile}</p>
              <p><strong>🔑 Identity:</strong> {decryptionResult.identity.substring(0, 20)}...</p>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#155724' }}>
              Your file has been successfully decrypted!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
