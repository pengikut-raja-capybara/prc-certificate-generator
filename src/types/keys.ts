export interface UserKey {
  id: string; // e.g. "USR-001"
  name: string;
  role: string;
  organization: string;
  email?: string;
  publicKey: string; // PEM format
  privateKey: string; // PEM format
}

export interface StoredCert {
  userId: string;
  serialNumber: string;
  p12Base64: string; // Base64 encoded PKCS#12 (.p12)
  p12Password?: string; // PKCS#12 encryption password
  certPem: string;
  caCertPem: string;
  createdAt: string;
}

export interface CaCertificateData {
  organization: string;
  commonName: string;
  privateKeyPem: string;
  publicKeyPem: string;
  caCertPem: string;
  createdAt: string;
}

export interface KeyBundle {
  version: string;
  ca: CaCertificateData;
  signers: Array<{
    key: UserKey;
    cert?: StoredCert;
  }>;
  exportedAt: string;
}
