import { PDF, P12Signer } from '@libpdf/core';
import type { SignatureManifest, GeneratedCertificate } from '../types/generator';
import type { UserKey, StoredCert } from '../types/keys';
import type { StampStyleType } from '../types/template';
import { renderStampToPdf } from './stamp-renderer';
import { sha256, buildUserListHash, buildCanonicalPayload, signPayload, verifySignature } from './crypto';
import { fabricToPdfRect } from './coord-mapper';

export interface SignStepOptions {
  certificate: GeneratedCertificate;
  signer: UserKey;
  storedCert: StoredCert;
  p12Password?: string;
  institutionName?: string;
  stampPosition: {
    x: number; // Fabric coords
    y: number;
    width: number;
    height: number;
    style: StampStyleType;
  };
  pageHeight: number;
  allUsers: UserKey[];
}

export interface SignStepResult {
  signedPdfBytes: Uint8Array;
  updatedManifest: SignatureManifest;
}

/**
 * Executes a modular, order-independent digital signing step for a certificate:
 * 1. Incrementally renders the active signer's stamp on the reserved position
 * 2. Applies PAdES X.509 digital signature
 * 3. Updates the cryptographic multi-signature manifest
 */
export async function executeSigningStep(options: SignStepOptions): Promise<SignStepResult> {
  const {
    certificate,
    signer,
    storedCert,
    p12Password = 'secret_password_123',
    institutionName = 'Universitas Kuvukiland',
    stampPosition,
    pageHeight,
    allUsers,
  } = options;

  // 1. Decode P12 bytes
  const p12BinaryStr = atob(storedCert.p12Base64);
  const p12Bytes = new Uint8Array(p12BinaryStr.length);
  for (let i = 0; i < p12BinaryStr.length; i++) {
    p12Bytes[i] = p12BinaryStr.charCodeAt(i);
  }

  // 2. Load PDF into @libpdf/core
  const doc = await PDF.load(certificate.currentPdfBytes);
  const page = doc.getPage(0);
  if (!page) {
    throw new Error('Halaman pertama PDF tidak ditemukan');
  }

  // 3. Convert stamp coords from Fabric to PDF points (bottom-left origin)
  const pdfRect = fabricToPdfRect(
    {
      x: stampPosition.x,
      y: stampPosition.y,
      width: stampPosition.width,
      height: stampPosition.height,
    },
    pageHeight
  );

  // 4. Render visual stamp for THIS signer only
  await renderStampToPdf(doc, page, {
    signerName: signer.name,
    signerRole: signer.role,
    organization: signer.organization || institutionName,
    serialNumber: storedCert.serialNumber,
    documentId: certificate.manifest.documentId,
    style: stampPosition.style,
    x: pdfRect.x,
    y: pdfRect.y,
    width: pdfRect.width,
    height: pdfRect.height,
  });

  // 5. Apply PAdES Digital Signature
  const p12Signer = await P12Signer.create(p12Bytes, p12Password);
  const { bytes: signedBytes } = await doc.sign({
    signer: p12Signer,
    reason: `Pengesahan oleh ${signer.role} ${institutionName}`,
    location: 'Indonesia',
    contactInfo: signer.email || `${signer.id.toLowerCase()}@kuvukiland.ac.id`,
  });

  const signedPdfBytes = new Uint8Array(signedBytes);

  // 6. Update Manifest
  const newFileHash = sha256(signedPdfBytes);
  const userListHash = buildUserListHash(allUsers);
  const now = new Date().toISOString();

  const { rawPayload, payloadHash } = buildCanonicalPayload({
    protocol: 'LIGHTSIGN-v1',
    documentId: certificate.manifest.documentId,
    fileHash: newFileHash,
    userListHash,
    policy: certificate.manifest.policy,
    k: certificate.manifest.k,
    n: certificate.manifest.n,
    version: certificate.manifest.version,
  });

  const cryptoSig = signPayload(signer.privateKey, payloadHash);

  const updatedManifest: SignatureManifest = {
    ...certificate.manifest,
    stage: certificate.manifest.stage + 1,
    targetFileName: certificate.fileName,
    fileHash: newFileHash,
    userListHash,
    rawPayload,
    payloadHash,
    digitalSignatures: [
      ...certificate.manifest.digitalSignatures,
      {
        signerId: signer.id,
        signerName: signer.name,
        signerRole: signer.role,
        issuedBy: institutionName,
        reason: `Pengesahan oleh ${signer.role} ${institutionName}`,
        signedAt: now,
        p12Password,
      },
    ],
    signatures: [
      ...certificate.manifest.signatures,
      {
        userId: signer.id,
        name: signer.name,
        role: signer.role,
        signedAt: now,
        signature: cryptoSig,
        fileHash: newFileHash,
        byteLength: signedPdfBytes.byteLength,
        p12Password,
      },
    ],
    signerCredentials: [
      ...(certificate.manifest.signerCredentials || []).filter((sc) => sc.signerId !== signer.id),
      {
        signerId: signer.id,
        signerName: signer.name,
        role: signer.role,
        organization: signer.organization || institutionName,
        p12Password,
        serialNumber: storedCert.serialNumber,
      },
    ],
  };

  return { signedPdfBytes, updatedManifest };
}

/**
 * Verifies certificate signatures and file integrity against manifest
 */
export function verifyCertificateIntegrity(
  pdfBytes: Uint8Array,
  manifest: SignatureManifest,
  signers: UserKey[]
): {
  isValid: boolean;
  fileHashMatch: boolean;
  signaturesCount: number;
  totalRequired: number;
  details: string[];
} {
  const currentHash = sha256(pdfBytes);
  const fileHashMatch = currentHash === manifest.fileHash;
  const details: string[] = [];

  if (!fileHashMatch) {
    details.push(`File hash mismatch: current=${currentHash.slice(0, 16)}... != manifest=${manifest.fileHash.slice(0, 16)}...`);
  } else {
    details.push(`File integrity verified (SHA-256: ${currentHash.slice(0, 16)}...)`);
  }

  for (const sig of manifest.signatures) {
    const signer = signers.find((s) => s.id === sig.userId);
    if (!signer) {
      details.push(`Signer not recognized: ${sig.userId}`);
      continue;
    }
    const sigOk = verifySignature(signer.publicKey, manifest.payloadHash, sig.signature);
    if (sigOk) {
      details.push(`✓ Signature valid for ${sig.name} (${sig.role})`);
    } else {
      details.push(`✗ Signature INVALID for ${sig.name}`);
    }
  }

  return {
    isValid: fileHashMatch && manifest.signatures.length >= 1,
    fileHashMatch,
    signaturesCount: manifest.signatures.length,
    totalRequired: manifest.k,
    details,
  };
}

export interface BatchSignOptions {
  certificates: GeneratedCertificate[];
  signer: UserKey;
  storedCert: StoredCert;
  p12Password?: string;
  institutionName?: string;
  stampPosition: {
    x: number;
    y: number;
    width: number;
    height: number;
    style: StampStyleType;
  };
  pageHeight: number;
  allUsers: UserKey[];
  totalExpectedSigners?: number;
  onProgress?: (current: number, total: number) => void;
}

/**
 * Signs all pending certificates for a specific signer in 1-click batch mode
 */
export async function batchSignAllCertificates(options: BatchSignOptions): Promise<GeneratedCertificate[]> {
  const {
    certificates,
    signer,
    storedCert,
    p12Password = 'secret_password_123',
    institutionName = 'Universitas Kuvukiland',
    stampPosition,
    pageHeight,
    allUsers,
    totalExpectedSigners = 2,
    onProgress,
  } = options;

  const updated: GeneratedCertificate[] = [];
  const total = certificates.length;

  for (let i = 0; i < total; i++) {
    // Yield to browser event loop so UI progress updates smoothly
    await new Promise((resolve) => setTimeout(resolve, 20));

    const cert = certificates[i];
    if (cert.signedBy.includes(signer.id)) {
      updated.push(cert);
      if (onProgress) onProgress(i + 1, total);
      continue;
    }

    try {
      const { signedPdfBytes, updatedManifest } = await executeSigningStep({
        certificate: cert,
        signer,
        storedCert,
        p12Password,
        institutionName,
        stampPosition,
        pageHeight,
        allUsers,
      });

      const updatedSignedBy = [...cert.signedBy, signer.id];
      const isFullySigned = updatedSignedBy.length >= totalExpectedSigners;

      updated.push({
        ...cert,
        currentPdfBytes: signedPdfBytes,
        manifest: updatedManifest,
        signedBy: updatedSignedBy,
        status: isFullySigned ? 'fully-signed' : 'partially-signed',
      });
    } catch (err: any) {
      console.error(`Error batch signing cert ${cert.id}:`, err);
      updated.push(cert);
    }

    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return updated;
}

