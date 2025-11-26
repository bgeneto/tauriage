import { createContext, useContext, useState, ReactNode } from 'react';
import { AgeKeyPair, StoredKey } from '../types';

interface EncryptionState {
  selectedFile: string | null;
  outputFile: string;
  recipients: string[];
  useArmor: boolean;
}

interface DecryptionState {
  selectedFile: string | null;
  outputFile: string;
  identity: string;
}

interface KeyManagementState {
  generatedKey: AgeKeyPair | null;
  keyName: string;
  sshKey: string;
  storedKeys: StoredKey[];
}

interface EncryptionContextType {
  encryption: EncryptionState;
  setEncryptionSelectedFile: (file: string | null) => void;
  setEncryptionOutputFile: (file: string) => void;
  setEncryptionRecipients: (recipients: string[]) => void;
  addEncryptionRecipient: (recipient: string) => void;
  removeEncryptionRecipient: (index: number) => void;
  setEncryptionUseArmor: (useArmor: boolean) => void;
  clearEncryptionState: () => void;

  decryption: DecryptionState;
  setDecryptionSelectedFile: (file: string | null) => void;
  setDecryptionOutputFile: (file: string) => void;
  setDecryptionIdentity: (identity: string) => void;
  clearDecryptionState: () => void;

  keyManagement: KeyManagementState;
  setGeneratedKey: (key: AgeKeyPair | null) => void;
  setKeyName: (name: string) => void;
  setSshKey: (key: string) => void;
  setStoredKeys: (keys: StoredKey[]) => void;
  addStoredKey: (key: StoredKey) => void;
  removeStoredKey: (index: number) => void;
  clearKeyManagementState: () => void;
}

const EncryptionContext = createContext<EncryptionContextType | undefined>(undefined);

export function EncryptionStateProvider({ children }: { children: ReactNode }) {
  const [encryption, setEncryption] = useState<EncryptionState>({
    selectedFile: null,
    outputFile: '',
    recipients: [],
    useArmor: false,
  });

  const [decryption, setDecryption] = useState<DecryptionState>({
    selectedFile: null,
    outputFile: '',
    identity: '',
  });

  const [keyManagement, setKeyManagement] = useState<KeyManagementState>({
    generatedKey: null,
    keyName: '',
    sshKey: '',
    storedKeys: [],
  });

  const setEncryptionSelectedFile = (file: string | null) => {
    setEncryption(prev => ({ ...prev, selectedFile: file }));
  };

  const setEncryptionOutputFile = (file: string) => {
    setEncryption(prev => ({ ...prev, outputFile: file }));
  };

  const setEncryptionRecipients = (recipients: string[]) => {
    setEncryption(prev => ({ ...prev, recipients }));
  };

  const addEncryptionRecipient = (recipient: string) => {
    setEncryption(prev => ({
      ...prev,
      recipients: [...prev.recipients, recipient],
    }));
  };

  const removeEncryptionRecipient = (index: number) => {
    setEncryption(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index),
    }));
  };

  const setEncryptionUseArmorState = (useArmor: boolean) => {
    setEncryption(prev => ({
      ...prev,
      useArmor,
    }));
  };

  const clearEncryptionState = () => {
    setEncryption({
      selectedFile: null,
      outputFile: '',
      recipients: [],
      useArmor: false,
    });
  };

  const setDecryptionSelectedFile = (file: string | null) => {
    setDecryption(prev => ({ ...prev, selectedFile: file }));
  };

  const setDecryptionOutputFile = (file: string) => {
    setDecryption(prev => ({ ...prev, outputFile: file }));
  };

  const setDecryptionIdentity = (identity: string) => {
    setDecryption(prev => ({ ...prev, identity }));
  };

  const clearDecryptionState = () => {
    setDecryption({
      selectedFile: null,
      outputFile: '',
      identity: '',
    });
  };

  const setGeneratedKey = (key: AgeKeyPair | null) => {
    setKeyManagement(prev => ({ ...prev, generatedKey: key }));
  };

  const setKeyNameState = (name: string) => {
    setKeyManagement(prev => ({ ...prev, keyName: name }));
  };

  const setSshKeyState = (key: string) => {
    setKeyManagement(prev => ({ ...prev, sshKey: key }));
  };

  const setStoredKeysState = (keys: StoredKey[]) => {
    setKeyManagement(prev => ({ ...prev, storedKeys: keys }));
  };

  const addStoredKeyState = (key: StoredKey) => {
    setKeyManagement(prev => ({
      ...prev,
      storedKeys: [...prev.storedKeys, key],
    }));
  };

  const removeStoredKeyState = (index: number) => {
    setKeyManagement(prev => ({
      ...prev,
      storedKeys: prev.storedKeys.filter((_, i) => i !== index),
    }));
  };

  const clearKeyManagementState = () => {
    setKeyManagement({
      generatedKey: null,
      keyName: '',
      sshKey: '',
      storedKeys: [],
    });
  };

  return (
    <EncryptionContext.Provider
      value={{
        encryption,
        setEncryptionSelectedFile,
        setEncryptionOutputFile,
        setEncryptionRecipients,
        addEncryptionRecipient,
        removeEncryptionRecipient,
        setEncryptionUseArmor: setEncryptionUseArmorState,
        clearEncryptionState,
        decryption,
        setDecryptionSelectedFile,
        setDecryptionOutputFile,
        setDecryptionIdentity,
        clearDecryptionState,
        keyManagement,
        setGeneratedKey,
        setKeyName: setKeyNameState,
        setSshKey: setSshKeyState,
        setStoredKeys: setStoredKeysState,
        addStoredKey: addStoredKeyState,
        removeStoredKey: removeStoredKeyState,
        clearKeyManagementState,
      }}
    >
      {children}
    </EncryptionContext.Provider>
  );
}

export function useEncryptionState() {
  const context = useContext(EncryptionContext);
  if (!context) {
    throw new Error('useEncryptionState must be used within EncryptionStateProvider');
  }
  return context;
}
