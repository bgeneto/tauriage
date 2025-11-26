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

export function DecryptionTab() {
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const { decryptFile } = useAgeOperations();
    const { loadKeyStorage } = useKeyStore();
    const {
        decryption,
        setDecryptionSelectedFile,
        setDecryptionOutputFile,
        setDecryptionIdentity,
        clearDecryptionState,
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
                console.log('No stored keys available for decryption');
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
                    if (filePath.toLowerCase().endsWith('.age')) {
                        setDecryptionSelectedFile(filePath);
                        // Auto-set output location to same directory
                        const fileName = filePath.split('\\').pop()?.split('/').pop() || 'file';
                        const baseName = fileName.endsWith('.age') ? fileName.slice(0, -4) : fileName;
                        const dir = filePath.substring(0, filePath.lastIndexOf('\\') + 1) || filePath.substring(0, filePath.lastIndexOf('/') + 1);
                        const normalizedDir = dir.replace(/\\/g, '/');
                        const outputPath = `${normalizedDir}${baseName}`;
                        setDecryptionOutputFile(outputPath);
                    } else {
                        showToast('warning', 'Invalid file', 'Please drop a .age encrypted file');
                    }
                }
            } else if (event.payload.type === 'leave') {
                setIsDragging(false);
            }
        });

        return () => {
            unlistenPromise.then(unlisten => unlisten());
        };
    }, [setDecryptionSelectedFile, setDecryptionOutputFile]);

    const handleBrowseFile = async () => {
        const file = await open({
            multiple: false,
            directory: false,
            filters: [{
                name: 'Age Encrypted Files',
                extensions: ['age']
            }]
        });

        if (file) {
            const filePath = file as string;
            setDecryptionSelectedFile(filePath);
            // Auto-set output location to same directory
            const fileName = filePath.split('\\').pop()?.split('/').pop() || 'file';
            const baseName = fileName.endsWith('.age') ? fileName.slice(0, -4) : fileName;
            const dir = filePath.substring(0, filePath.lastIndexOf('\\') + 1) || filePath.substring(0, filePath.lastIndexOf('/') + 1);
            const normalizedDir = dir.replace(/\\/g, '/');
            const outputPath = `${normalizedDir}${baseName}`;
            setDecryptionOutputFile(outputPath);
            showToast('success', 'Output location auto-set', `Will save to: ${baseName}`);
        }
    };

    const handlePickOutputFile = async () => {
        if (!decryption.selectedFile) {
            showToast('warning', 'Select a file first', 'Please select an encrypted .age file first');
            return;
        }

        const folder = await pickSaveLocation('Choose folder to save decrypted file');
        if (folder) {
            const fileName = decryption.selectedFile.split('\\').pop()?.split('/').pop() || 'file';
            const baseName = fileName.endsWith('.age') ? fileName.slice(0, -4) : fileName;
            const normalizedFolder = folder.replace(/\\/g, '/');
            const outputPath = `${normalizedFolder}/${baseName}`;
            setDecryptionOutputFile(outputPath);
            showToast('success', 'Output location set');
        }
    };

    const handleUseStoredKey = (storedKey: StoredKey) => {
        if (storedKey.privateKey) {
            setDecryptionIdentity(storedKey.privateKey);
            showToast('success', 'Private key loaded', storedKey.name);
        }
    };

    const handleDecrypt = async () => {
        // Validation with user feedback
        if (!decryption.selectedFile) {
            showToast('error', 'Missing encrypted file', 'Please select a .age file to decrypt');
            return;
        }

        if (!decryption.outputFile) {
            showToast('error', 'Missing output location', 'Please choose where to save the decrypted file');
            return;
        }

        if (!decryption.identity.trim()) {
            showToast('error', 'Missing private key', 'Please provide your private key for decryption');
            return;
        }

        // Validate key format before attempting decryption
        const trimmed = decryption.identity.trim();
        const isAgeKey = trimmed.startsWith('AGE-SECRET-KEY-');
        const isSshKey = trimmed.startsWith('-----BEGIN') || trimmed.startsWith('ssh-');

        if (!isAgeKey && !isSshKey) {
            showToast('error', 'Invalid key format',
                'Key must be either:\n• Age key: AGE-SECRET-KEY-...\n• SSH key: -----BEGIN or ssh-...');
            return;
        }

        setIsDecrypting(true);

        try {
            const result = await decryptFile(decryption.selectedFile, decryption.outputFile, decryption.identity.trim());
            clearDecryptionState();
            showToast('success', 'Decryption successful!', `File saved to ${result.outputFile}`);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Decryption failed';
            showToast('error', 'Decryption failed', errorMsg);
        } finally {
            setIsDecrypting(false);
        }
    };

    const getFileName = (path: string) => {
        return path.split('\\').pop()?.split('/').pop() || path;
    };

    const handlePastePrivateKeyFromClipboard = async () => {
        try {
            const clipboard = await readText();
            if (clipboard && clipboard.trim()) {
                const trimmed = clipboard.trim();

                // Validate key format
                const isAgeKey = trimmed.startsWith('AGE-SECRET-KEY-');
                const isSshKey = trimmed.startsWith('-----BEGIN') || trimmed.startsWith('ssh-');

                if (!isAgeKey && !isSshKey) {
                    showToast('error', 'Invalid key format',
                        'Key must be either an age key (AGE-SECRET-KEY-...) or SSH key (-----BEGIN... or ssh-...)');
                    return;
                }

                setDecryptionIdentity(trimmed);
                const keyType = isAgeKey ? 'age' : 'SSH';
                showToast('success', 'Pasted from clipboard', `${keyType} private key loaded`);
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
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">File Decryption</h2>
                <p className="text-slate-600 dark:text-slate-400">Drag and drop an encrypted .age file to decrypt it.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Drag and Drop Area */}
                <div className="space-y-4">
                    <div
                        className={`
              border-2 border-dashed rounded-lg p-12 text-center transition-all
              ${isDragging
                                ? 'border-slate-500 bg-slate-100 dark:bg-slate-800 dark:border-slate-400'
                                : decryption.selectedFile
                                    ? 'border-slate-400 bg-slate-50 dark:bg-slate-900 dark:border-slate-600'
                                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }
            `}
                    >
                        {decryption.selectedFile ? (
                            <div className="space-y-4">
                                <div className="text-5xl">🔒</div>
                                <div>
                                    <div className="font-semibold text-slate-900 dark:text-white mb-1">Selected File:</div>
                                    <div className="text-sm text-slate-600 dark:text-slate-400 break-all px-4">{getFileName(decryption.selectedFile)}</div>
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
                                        onClick={() => setDecryptionSelectedFile(null)}
                                        className="px-4 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="text-6xl">{isDragging ? '⬇️' : '🔐'}</div>
                                <div>
                                    <div className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                                        {isDragging ? 'Drop .age file here' : 'Drag & Drop .age File'}
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
                        <div className={`px-3 py-2 rounded text-sm truncate border ${decryption.outputFile ? 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-500'}`}>
                            {decryption.outputFile || 'Choose where to save decrypted file...'}
                        </div>
                        <button
                            onClick={handlePickOutputFile}
                            className="w-full px-4 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
                        >
                            Choose Location
                        </button>
                    </div>
                </div>

                {/* Private Key Section */}
                <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-800 space-y-4 transition-colors duration-200">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">🔑 Private Key</h3>

                        {storedKeys.length > 0 && storedKeys.some(k => k.privateKey) && (
                            <div className="space-y-2">
                                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">Your saved keys:</div>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {storedKeys
                                        .filter(key => key.privateKey)
                                        .map((key) => (
                                            <button
                                                key={key.id}
                                                onClick={() => handleUseStoredKey(key)}
                                                className="w-full text-left px-3 py-2 text-sm bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                                            >
                                                + Use {key.name}
                                            </button>
                                        ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Paste a private age or ssh key:</label>
                            <textarea
                                value={decryption.identity}
                                onChange={(e) => setDecryptionIdentity(e.target.value)}
                                placeholder="AGE-SECRET-KEY-..."
                                className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 transition-colors"
                                rows={4}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handlePastePrivateKeyFromClipboard}
                                    className="flex-1 px-4 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-medium transition-colors"
                                >
                                    📋 Paste from Clipboard
                                </button>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                <span>🔐</span>
                                <span>Your private key is kept in memory only and never stored</span>
                            </div>
                        </div>
                    </div>

                    {/* Key Status */}
                    {decryption.identity && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 transition-colors duration-200">
                            <div className="font-semibold text-emerald-900 dark:text-emerald-400 mb-2">
                                ✓ Private key loaded
                            </div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                                Ready to decrypt
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Decrypt Button - Always enabled, validation via toast messages */}
            <button
                onClick={handleDecrypt}
                disabled={isDecrypting}
                className="w-full px-6 py-4 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 disabled:bg-slate-300 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all shadow-sm hover:shadow-md text-lg"
                style={{ color: '#ffffff' }}
            >
                {isDecrypting ? '⏳ Decrypting...' : '🔓 Decrypt File'}
            </button>
        </div>
    );
}
