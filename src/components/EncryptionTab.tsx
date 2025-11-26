import { useState, useEffect } from 'react';
import { useAgeOperations } from '../hooks/useAge';
import { pickSaveLocation } from '../utils/file';
import { StoredKey } from '../types';
import { useKeyStore } from '../hooks/useKeyStore';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { open } from '@tauri-apps/plugin-dialog';
import { readText } from '@tauri-apps/plugin-clipboard-manager';
import Toast, { ToastMessage } from './Toast';
import { useEncryptionState } from '../context/EncryptionStateContext';

export function EncryptionTab() {
  const [recipientInput, setRecipientInput] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const { encryptFile } = useAgeOperations();
  const { loadKeyStorage } = useKeyStore();
  const {
    encryption,
    setEncryptionSelectedFile,
    setEncryptionOutputFile,
    addEncryptionRecipient,
    removeEncryptionRecipient,
    setEncryptionUseArmor,
    clearEncryptionState,
  } = useEncryptionState();

  const [storedKeys, setStoredKeys] = useState<StoredKey[]>([]);

  const showToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
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

  useEffect(() => {
    const appWindow = getCurrentWebviewWindow();

    const unlistenPromise = appWindow.onDragDropEvent((event) => {
      if (event.payload.type === 'over') {
        setIsDragging(true);
      } else if (event.payload.type === 'drop') {
        setIsDragging(false);
        const paths = event.payload.paths;
        if (paths && paths.length > 0) {
          const filePath = paths[0];
          setEncryptionSelectedFile(filePath);
          // Auto-set output location to same directory
          const fileName = filePath.split('\\').pop()?.split('/').pop() || 'file';
          const dir = filePath.substring(0, filePath.lastIndexOf('\\') + 1) || filePath.substring(0, filePath.lastIndexOf('/') + 1);
          const normalizedDir = dir.replace(/\\/g, '/');
          const outputPath = `${normalizedDir}${fileName}.age`;
          setEncryptionOutputFile(outputPath);
        }
      } else if (event.payload.type === 'leave') {
        setIsDragging(false);
      }
    });

    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  }, [setEncryptionSelectedFile, setEncryptionOutputFile]);

  const handleBrowseFile = async () => {
    const file = await open({
      multiple: false,
      directory: false,
    });

    if (file) {
      const filePath = file as string;
      setEncryptionSelectedFile(filePath);
      // Auto-set output location to same directory
      const fileName = filePath.split('\\').pop()?.split('/').pop() || 'file';
      const dir = filePath.substring(0, filePath.lastIndexOf('\\') + 1) || filePath.substring(0, filePath.lastIndexOf('/') + 1);
      const normalizedDir = dir.replace(/\\/g, '/');
      const outputPath = `${normalizedDir}${fileName}.age`;
      setEncryptionOutputFile(outputPath);
      showToast('success', 'Output location auto-set', `Will save to: ${fileName}.age`);
    }
  };

  const handlePickOutputFile = async () => {
    if (!encryption.selectedFile) {
      showToast('warning', 'Select a file first', 'Please select an input file before choosing output location');
      return;
    }

    const folder = await pickSaveLocation('Choose folder to save encrypted file');
    if (folder) {
      const fileName = encryption.selectedFile.split('\\').pop()?.split('/').pop() || 'file';
      const normalizedFolder = folder.replace(/\\/g, '/');
      const outputPath = `${normalizedFolder}/${fileName}.age`;
      setEncryptionOutputFile(outputPath);
      showToast('success', 'Output location set');
    }
  };

  const handleAddRecipient = () => {
    const trimmedInput = recipientInput.trim();
    if (!trimmedInput) {
      showToast('warning', 'Empty recipient', 'Please enter a recipient public key');
      return;
    }
    if (encryption.recipients.includes(trimmedInput)) {
      showToast('info', 'Recipient exists', 'This key is already added');
      return;
    }
    addEncryptionRecipient(trimmedInput);
    setRecipientInput('');
    showToast('success', 'Recipient added');
  };

  const handleAddStoredKeyAsRecipient = (storedKey: StoredKey) => {
    if (encryption.recipients.includes(storedKey.publicKey)) {
      showToast('info', 'Recipient exists', `${storedKey.name} is already added`);
      return;
    }
    addEncryptionRecipient(storedKey.publicKey);
    showToast('success', 'Recipient added', storedKey.name);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddRecipient();
    }
  };

  const handleEncrypt = async () => {
    // Validation with user feedback
    if (!encryption.selectedFile) {
      showToast('error', 'Missing input file', 'Please select a file to encrypt');
      return;
    }

    if (!encryption.outputFile) {
      showToast('error', 'Missing output location', 'Please choose where to save the encrypted file');
      return;
    }

    if (encryption.recipients.length === 0) {
      showToast('error', 'No recipients', 'Please add at least one recipient public key');
      return;
    }

    setIsEncrypting(true);

    try {
      const result = await encryptFile(encryption.selectedFile, encryption.outputFile, encryption.recipients, encryption.useArmor);
      clearEncryptionState();
      showToast('success', 'Encryption successful!', `File saved to ${result.outputFile}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Encryption failed';
      showToast('error', 'Encryption failed', errorMsg);
    } finally {
      setIsEncrypting(false);
    }
  };

  const getFileName = (path: string) => {
    return path.split('\\').pop()?.split('/').pop() || path;
  };

  const handlePasteRecipientFromClipboard = async () => {
    try {
      const clipboard = await readText();
      if (clipboard && clipboard.trim()) {
        setRecipientInput(clipboard.trim());
        showToast('success', 'Pasted from clipboard');
      }
    } catch (err) {
      showToast('error', 'Failed to read clipboard', 'Could not access clipboard');
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
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">File Encryption</h2>
        <p className="text-slate-600 dark:text-slate-400">Drag and drop a file or browse to encrypt it.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Drag and Drop Area */}
        <div className="space-y-4">
          <div
            className={`
              border-2 border-dashed rounded-lg p-12 text-center transition-all
              ${isDragging
                ? 'border-slate-500 bg-slate-100 dark:bg-slate-800 dark:border-slate-400'
                : encryption.selectedFile
                  ? 'border-slate-400 bg-slate-50 dark:bg-slate-900 dark:border-slate-600'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
              }
            `}
          >
            {encryption.selectedFile ? (
              <div className="space-y-4">
                <div className="text-5xl">📄</div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white mb-1">Selected File:</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 break-all px-4">{getFileName(encryption.selectedFile)}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleBrowseFile}
                    className="flex-1 px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                    style={{ color: '#ffffff' }}
                  >
                    Choose Different File
                  </button>
                  <button
                    onClick={() => setEncryptionSelectedFile(null)}
                    className="px-4 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-6xl">{isDragging ? '⬇️' : '📁'}</div>
                <div>
                  <div className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {isDragging ? 'Drop file here' : 'Drag & Drop File'}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">or</div>
                  <button
                    onClick={handleBrowseFile}
                    className="px-6 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                    style={{ color: '#ffffff' }}
                  >
                    Browse Files
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Output Location */}
          <div className="space-y-3 bg-white dark:bg-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-800 transition-colors duration-200">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">💾 Output Location</h3>
            <div className={`px-3 py-2 rounded text-sm truncate border ${encryption.outputFile ? 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-500'}`}>
              {encryption.outputFile || 'Choose where to save encrypted file...'}
            </div>
            <button
              onClick={handlePickOutputFile}
              className="w-full px-4 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
            >
              Choose Location
            </button>
          </div>
        </div>

        {/* Recipients Section */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-800 space-y-4 transition-colors duration-200">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">🔑 Add Recipients</h3>

            {storedKeys.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Your saved keys:</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {storedKeys.map(key => (
                    <button
                      key={key.id}
                      onClick={() => handleAddStoredKeyAsRecipient(key)}
                      className="w-full text-left px-3 py-2 text-sm bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                    >
                      + {key.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Paste a public age or ssh key:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={recipientInput}
                  onChange={e => setRecipientInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="age1xyz..."
                  className="flex-1 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 transition-colors"
                />
                <button
                  onClick={handleAddRecipient}
                  className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded font-medium transition-colors"
                  style={{ color: '#ffffff' }}
                >
                  Add
                </button>
              </div>
              <button
                onClick={handlePasteRecipientFromClipboard}
                className="w-full px-4 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-medium transition-colors"
              >
                📋 Paste from Clipboard
              </button>
            </div>
          </div>

          {/* Armor Option */}
          <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 transition-colors duration-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={encryption.useArmor}
                onChange={(e) => setEncryptionUseArmor(e.target.checked)}
                className="w-4 h-4 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                🛡️ Use Armor (ASCII encoding)
              </span>
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 ml-7">
              Encodes encrypted output in ASCII text format instead of binary. Useful for text-based communication.
            </p>
          </div>

          {/* Recipients List */}
          {encryption.recipients.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 transition-colors duration-200">
              <div className="font-semibold text-slate-900 dark:text-white mb-3">
                Recipients ({encryption.recipients.length})
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {encryption.recipients.map((recipient, index) => (
                  <div key={index} className="flex items-center gap-2 bg-white dark:bg-slate-950 rounded p-2 text-sm transition-colors">
                    <span className="flex-1 font-mono text-slate-700 dark:text-slate-300 truncate text-xs">{recipient}</span>
                    <button
                      onClick={() => removeEncryptionRecipient(index)}
                      className="px-2 py-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-xs font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Encrypt Button - Always enabled, validation via toast messages */}
      <button
        onClick={handleEncrypt}
        disabled={isEncrypting}
        className="w-full px-6 py-4 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 disabled:bg-slate-300 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all shadow-sm hover:shadow-md text-lg"
        style={{ color: '#ffffff' }}
      >
        {isEncrypting ? '⏳ Encrypting...' : '🔒 Encrypt File'}
      </button>
    </div>
  );
}

