export interface BatchRow {
  [column: string]: string | number;
}

export interface SignerCredentialInfo {
  signerId: string;
  signerName: string;
  role: string;
  organization: string;
  p12Password: string;
  serialNumber?: string;
}

export interface DigitalSignatureInfo {
  signerId?: string;
  signerName: string;
  signerRole: string;
  issuedBy: string;
  reason: string;
  signedAt: string;
  p12Password?: string;
}

export interface CryptographicSignature {
  userId: string;
  name: string;
  role: string;
  signedAt: string;
  signature: string;
  fileHash: string;
  byteLength: number;
  p12Password?: string;
}

export interface SignatureManifest {
  protocol: string;
  documentId: string;
  stage: number;
  targetFileName: string;
  fileHash: string;
  userListHash: string;
  policy: string;
  k: number;
  n: number;
  version: number;
  rawPayload: string;
  payloadHash: string;
  digitalSignatures: DigitalSignatureInfo[];
  signatures: CryptographicSignature[];
  signerCredentials?: SignerCredentialInfo[];
}

export interface GeneratedCertificate {
  id: string;
  rowNumber: number;
  data: BatchRow;
  fileName: string;
  basePdfBytes: Uint8Array;
  currentPdfBytes: Uint8Array;
  thumbnailUrl?: string;
  status: 'base-ready' | 'partially-signed' | 'fully-signed' | 'error';
  signedBy: string[]; // List of signer IDs
  manifest: SignatureManifest;
  error?: string;
}

export type StepStatus = 'locked' | 'unlocked' | 'completed' | 'stale';

export interface StepPrerequisite {
  id: string;
  label: string;
  met: boolean;
}

export interface StepRequirementInfo {
  step: number;
  status: StepStatus;
  prerequisites: StepPrerequisite[];
  canAccess: boolean;
  blockReason?: string;
}

export interface BatchGenerationProgress {
  total: number;
  current: number;
  statusText: string;
  isRunning: boolean;
  completed: boolean;
  error?: string;
}

