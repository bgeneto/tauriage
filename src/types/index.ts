export interface AgeKeyPair {
  publicKey: string;
  privateKey: string;
  comment?: string;
}

export interface EncryptionResult {
  success: boolean;
  inputFile: string;
  outputFile: string;
  publicKeys: string[];
}

export interface DecryptionResult {
  success: boolean;
  inputFile: string;
  outputFile: string;
  identity: string;
}

export interface StoredKey {
  id: string;
  name: string;
  publicKey: string;
  privateKey?: string;
  comment?: string;
  createdAt: number;
}

export interface EncryptedKeyEntry {
  id: string;
  name: string;
  publicKey: string;
  comment?: string;
  createdAt: number;
  encryptedPrivateKey?: string; // encrypted with passphrase
}
