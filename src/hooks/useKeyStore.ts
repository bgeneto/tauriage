import { invoke } from '@tauri-apps/api/core';
import { StoredKey } from '../types';

export const useKeyStore = () => {
  const getDefaultKeyStoragePath = async (): Promise<string> => {
    try {
      return await invoke('get_default_key_storage_path_cmd');
    } catch (error) {
      throw new Error(`Failed to get default key storage path: ${error}`);
    }
  };

  const keyStorageExists = async (filePath?: string): Promise<boolean> => {
    try {
      return await invoke('key_storage_exists_cmd', { filePath });
    } catch (error) {
      console.error('Failed to check key storage existence:', error);
      return false;
    }
  };

  const loadKeyStorage = async (passphrase: string, filePath?: string): Promise<StoredKey[]> => {
    try {
      return await invoke('load_key_storage_cmd', { passphrase, filePath });
    } catch (error) {
      throw new Error(`Failed to load key storage: ${error}`);
    }
  };

  const saveKeyStorage = async (passphrase: string, keys: StoredKey[], filePath?: string): Promise<void> => {
    try {
      await invoke('save_key_storage_cmd', { passphrase, keys, filePath });
    } catch (error) {
      throw new Error(`Failed to save key storage: ${error}`);
    }
  };

  const createStoredKey = async (
    name: string,
    publicKey: string,
    privateKey?: string,
    comment?: string
  ): Promise<StoredKey> => {
    try {
      return await invoke('create_stored_key_cmd', {
        name,
        publicKey,
        privateKey,
        comment,
      });
    } catch (error) {
      throw new Error(`Failed to create stored key: ${error}`);
    }
  };

  const exportKeys = async (passphrase: string, keys: StoredKey[], filePath: string): Promise<void> => {
    try {
      await invoke('export_keys_cmd', { passphrase, keys, filePath });
    } catch (error) {
      throw new Error(`Failed to export keys: ${error}`);
    }
  };

  const importKeys = async (passphrase: string, filePath: string): Promise<StoredKey[]> => {
    try {
      return await invoke('import_keys_cmd', { passphrase, filePath });
    } catch (error) {
      throw new Error(`Failed to import keys: ${error}`);
    }
  };

  return {
    getDefaultKeyStoragePath,
    keyStorageExists,
    loadKeyStorage,
    saveKeyStorage,
    createStoredKey,
    exportKeys,
    importKeys,
  };
};
