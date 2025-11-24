import { invoke } from '@tauri-apps/api/core';
import { confirm, message } from '@tauri-apps/plugin-dialog';
import { Command } from '@tauri-apps/plugin-shell';
import { AgeKeyPair, EncryptionResult, DecryptionResult } from '../types';

export const useAgeOperations = () => {
  const generateKeys = async (comment?: string): Promise<AgeKeyPair> => {
    try {
      return await invoke('generate_age_keys', { comment });
    } catch (error) {
      console.error('Raw error object:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', Object.keys(error || {}));
      
      const errorMessage = String(error);
      console.error('Error string:', errorMessage);
      
      // Check if this is an age-keygen not found error
      const isAgeNotFound = 
        errorMessage.includes('age') || 
        errorMessage.includes('not found') || 
        errorMessage.includes('Failed to execute') ||
        errorMessage.includes('program not found');
      
      console.log('Is age not found error?', isAgeNotFound);
      console.log('Full error message:', errorMessage);
      
      if (isAgeNotFound) {
        console.log('Showing confirm dialog for age installation...');
        try {
          const confirmed = await confirm('Age command-line tool is not installed. Would you like to install it now?', {
            title: 'Install Age',
            kind: 'info',
          });
          console.log('User confirmed installation:', confirmed);
          
          if (confirmed) {
            try {
              const os = await invoke('get_platform') as string;
              console.log('Detected OS:', os);
              let commandName = '';
              let displayCommand = '';

              if (os === 'windows') {
                commandName = 'install-age-windows';
                displayCommand = 'winget install --id FiloSottile.age';
              } else if (os === 'linux') {
                commandName = 'install-age-linux';
                displayCommand = 'apt install age (or dnf install age)';
              } else if (os === 'macos') {
                commandName = 'install-age-macos';
                displayCommand = 'brew install age';
              } else {
                throw new Error(`Unsupported OS: ${os}`);
              }

              // Show progress message
              console.log(`Installing age using: ${displayCommand}`);
              
              const cmd = Command.create(commandName);
              const installOutput = await cmd.execute();
              console.log('Installation output:', installOutput);
              
              // Check if installation was successful
              if (installOutput.code === 0 || installOutput.code === null) {
                // Show success message
                await message(`Age has been installed successfully!\n\nCommand: ${displayCommand}\n\nRetrying key generation...`, {
                  title: 'Installation Successful',
                  kind: 'info',
                });
                
                // Small delay to ensure age is in PATH
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Try again
                console.log('Retrying key generation after installation...');
                return await invoke('generate_age_keys', { comment });
              } else {
                const errorOutput = installOutput.stderr || installOutput.stdout || 'Unknown error';
                console.error('Installation failed with code:', installOutput.code);
                console.error('Installation error output:', errorOutput);
                
                await message(`Age installation failed.\n\nError: ${errorOutput}\n\nPlease install age manually using:\n${displayCommand}`, {
                  title: 'Installation Failed',
                  kind: 'error',
                });
                
                throw new Error(`Installation failed with code ${installOutput.code}: ${errorOutput}`);
              }
            } catch (installError) {
              console.error('Installation error:', installError);
              const errorMsg = String(installError);
              
              // If it's not already a dialog error, show one
              if (!errorMsg.includes('Installation')) {
                await message(`Failed to install age: ${errorMsg}\n\nPlease install age manually using the appropriate command for your OS.`, {
                  title: 'Installation Error',
                  kind: 'error',
                });
              }
              
              throw installError;
            }
          } else {
            throw new Error('Age installation cancelled by user');
          }
        } catch (dialogError) {
          console.error('Dialog error:', dialogError);
          throw error;
        }
      } else {
        throw error;
      }
    }
  };

  const encryptFile = async (
    inputFile: string,
    outputFile: string,
    recipients: string[]
  ): Promise<EncryptionResult> => {
    try {
      return await invoke('encrypt_file_cmd', {
        inputFile,
        outputFile,
        recipients,
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
