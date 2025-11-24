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

  const [storedKeys, setStoredKeys] = useState<StoredKey[]>([]);

  React.useEffect(() => {
    const loadStoredKeys = async () => {
      try {
        const keys = await loadKeyStorage('', undefined);
        setStoredKeys(keys);
      } catch (error) {
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
      const result = await decryptFile(selectedInputFiles[0].path, outputFile, identity.trim());
      setDecryptionResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decryption failed');
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">File Decryption</h2>
        <p className="text-slate-600">Select encrypted files and provide private keys for decryption.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {decryptionResult && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-start gap-3">
          <span className="text-xl">✓</span>
          <div>
            <div className="font-semibold">Decryption successful!</div>
            <div className="text-sm mt-1">Output: {decryptionResult.outputFile}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-baseline gap-2">
            <h3 className="text-lg font-semibold text-slate-900">Step 1: Select Encrypted Files</h3>
            <span className="text-sm text-slate-500">Browse .age files</span>
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden h-96 bg-white">
            <FileExplorer
              selectionMode="single"
              selectedFiles={selectedInputFiles}
              onSelectionChange={setSelectedInputFiles}
              acceptedExtensions={['.age']}
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
            <h3 className="text-lg font-semibold text-slate-900">Step 3: Private Key</h3>
            
            {storedKeys.length > 0 && storedKeys.some(k => k.privateKey) && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-700">Your saved keys:</div>
                <div className="space-y-1">
                  {storedKeys
                    .filter(key => key.privateKey)
                    .map((key) => (
                      <button
                        key={key.id}
                        onClick={() => handleUseStoredKey(key)}
                        className="w-full text-left px-2 py-1 text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 rounded border border-slate-200 transition-colors"
                      >
                        + {key.name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">Paste Private Key</h3>
        <textarea
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
          placeholder="Paste your private key here...&#10;Example: AGE-SECRET-KEY-..."
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
          rows={6}
        />
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span>🔐</span>
          <span>Your private key is kept in memory only and never stored</span>
        </div>
      </div>

      <button
        onClick={handleDecrypt}
        disabled={isDecrypting || selectedInputFiles.length === 0 || !outputFile || !identity.trim()}
        className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
      >
        {isDecrypting ? '⏳ Decrypting...' : '🔓 Decrypt File'}
      </button>
    </div>
  );
}

