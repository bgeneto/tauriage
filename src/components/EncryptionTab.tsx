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

  const [storedKeys, setStoredKeys] = useState<StoredKey[]>([]);

  React.useEffect(() => {
    const loadStoredKeys = async () => {
      try {
        const keys = await loadKeyStorage('', undefined);
        setStoredKeys(keys);
      } catch (error) {
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
      const result = await encryptFile(selectedInputFiles[0].path, outputFile, recipients);
      setEncryptionResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Encryption failed');
    } finally {
      setIsEncrypting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">File Encryption</h2>
        <p className="text-slate-600">Select files to encrypt and choose public keys for recipients.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {encryptionResult && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-start gap-3">
          <span className="text-xl">✓</span>
          <div>
            <div className="font-semibold">Encryption successful!</div>
            <div className="text-sm mt-1">Output: {encryptionResult.outputFile}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-baseline gap-2">
            <h3 className="text-lg font-semibold text-slate-900">Step 1: Select Files</h3>
            <span className="text-sm text-slate-500">Browse your filesystem</span>
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden h-96 bg-white">
            <FileExplorer
              selectionMode="single"
              selectedFiles={selectedInputFiles}
              onSelectionChange={setSelectedInputFiles}
              acceptedExtensions={[]}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900">Step 2: Output Location</h3>
            <input
              type="text"
              value={outputFile}
              placeholder="Choose location..."
              readOnly
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-600 truncate"
            />
            <button
              onClick={handlePickOutputFile}
              disabled={selectedInputFiles.length === 0}
              className="w-full px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              Choose Location
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900">Step 3: Add Recipients</h3>
            
            {storedKeys.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-700">From your keys:</div>
                <div className="space-y-1">
                  {storedKeys.map(key => (
                    <button
                      key={key.id}
                      onClick={() => handleAddStoredKeyAsRecipient(key)}
                      disabled={recipients.includes(key.publicKey)}
                      className="w-full text-left px-2 py-1 text-xs bg-slate-50 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 rounded border border-slate-200 transition-colors"
                    >
                      + {key.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Or paste a key:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={recipientInput}
                  onChange={e => setRecipientInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="age1xyz..."
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={handleAddRecipient}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded text-sm font-medium transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {recipients.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="font-semibold text-blue-900 mb-3">Recipients ({recipients.length})</div>
          <div className="space-y-2">
            {recipients.map((recipient, index) => (
              <div key={index} className="flex items-center gap-2 bg-white rounded p-2 text-sm">
                <span className="flex-1 font-mono text-slate-700 truncate">{recipient}</span>
                <button
                  onClick={() => handleRemoveRecipient(index)}
                  className="px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors text-xs"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleEncrypt}
        disabled={selectedInputFiles.length === 0 || !outputFile || recipients.length === 0 || isEncrypting}
        className="w-full px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary hover:from-primary-600 hover:to-secondary-600 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
      >
        {isEncrypting ? '⏳ Encrypting...' : '🔒 Encrypt File'}
      </button>
    </div>
  );
}

