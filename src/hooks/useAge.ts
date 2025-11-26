import { invoke } from '@tauri-apps/api/core';
import { message } from '@tauri-apps/plugin-dialog';
import { AgeKeyPair, EncryptionResult, DecryptionResult } from '../types';

export const useAgeOperations = () => {
  const generateKeys = async (comment?: string): Promise<AgeKeyPair> => {
    try {
      return await invoke('generate_age_keys', { comment });
    } catch (error) {
      const errorMessage = String(error);
      await message(
        `Failed to generate keys: ${errorMessage}\n\nEnsure the application is properly installed.`,
        {
          title: 'Key Generation Error',
          kind: 'error',
        }
      );
      throw error;
    }
  };

  const encryptFile = async (
    inputFile: string,
    outputFile: string,
    recipients: string[],
    useArmor: boolean = false
  ): Promise<EncryptionResult> => {
    try {
      return await invoke('encrypt_file_cmd', {
        inputFile,
        outputFile,
        recipients,
        useArmor,
      });
    } catch (error) {
      throw new Error(`Failed to encrypt file: ${error}`);
    }
  };

  const decryptFile = async (
    inputFile: string,
    outputFile: string,
    identity: string
  ): Promise<DecryptionResult> => {
    try {
      return await invoke('decrypt_file_cmd', {
        inputFile,
        outputFile,
        identity,
      });
    } catch (error) {
      throw new Error(`Failed to decrypt file: ${error}`);
    }
  };

  const pasteSshKey = async (): Promise<string> => {
    try {
      return await invoke('paste_ssh_key_from_clipboard');
    } catch (error) {
      throw new Error(`Failed to paste SSH key: ${error}`);
    }
  };

  const derivePublicKeyFromSsh = async (sshPubkey: string): Promise<string> => {
    try {
      return await invoke('derive_public_key_from_ssh', { sshPubkey });
    } catch (error) {
      throw new Error(`Failed to derive public key from SSH: ${error}`);
    }
  };

  return {
    generateKeys,
    encryptFile,
    decryptFile,
    pasteSshKey,
    derivePublicKeyFromSsh,
  };
};
