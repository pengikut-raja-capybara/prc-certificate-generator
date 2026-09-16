import type { UserKey, StoredCert, CaCertificateData, KeyBundle } from '../types/keys';
import { createInstitutionCA, createUserP12Certificate, restoreCaInfo, DEFAULT_P12_PASSWORD } from './ca';
import { generateRSAKeyPair } from './crypto';

const STORAGE_KEY_CA = 'prc_cert_ca_data';
const STORAGE_KEY_SIGNERS = 'prc_cert_signers';
const STORAGE_KEY_CERTS = 'prc_cert_stored_certs';

// Default initial demo keys (only loaded if user explicitly clicks "Muat Contoh Demo")
export const INITIAL_DEFAULT_SIGNERS: UserKey[] = [
  {
    id: 'USR-001',
    name: 'Prof. Dr. Ir. H. Bones Santoso, M.Sc.',
    role: 'Rektor',
    organization: 'Universitas Kuvukiland',
    email: 'bones@kuvukiland.ac.id',
    publicKey:
      '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAnNqAG2oXO7+VQM/2BSMt3pa52z3N/xUOS//NkW9pubk=\n-----END PUBLIC KEY-----\n',
    privateKey:
      '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIF2JdURNUFrzn7ggxBpbgdb5o2k5KKkVQ1ROwhT86xs6\n-----END PRIVATE KEY-----\n',
  },
  {
    id: 'USR-002',
    name: 'Dr. Prince of Golf, M.Kom.',
    role: 'Dekan Fakultas',
    organization: 'Universitas Kuvukiland',
    email: 'prince@kuvukiland.ac.id',
    publicKey:
      '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAbf7YXRZbhrgjkWzkLnkRGptXy86T+YId+36OY0RyzN4=\n-----END PUBLIC KEY-----\n',
    privateKey:
      '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEILATbS3+xvF5DDV56viMFfROwrkRxeUQ7y5zEABzMhZ0\n-----END PRIVATE KEY-----\n',
  },
];

export function getStoredCa(): CaCertificateData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CA);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredCa(caData: CaCertificateData) {
  localStorage.setItem(STORAGE_KEY_CA, JSON.stringify(caData));
}

/**
 * Gets stored signers. Defaults to empty array [] so user has full control.
 */
export function getStoredSigners(): UserKey[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SIGNERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredSigners(signers: UserKey[]) {
  localStorage.setItem(STORAGE_KEY_SIGNERS, JSON.stringify(signers));
}

export function clearStoredSigners() {
  saveStoredSigners([]);
  saveStoredCerts({});
}

export function deleteStoredSigner(id: string) {
  const signers = getStoredSigners().filter((s) => s.id !== id);
  const certs = getStoredCerts();
  delete certs[id];
  saveStoredSigners(signers);
  saveStoredCerts(certs);
}


export function getStoredCerts(): Record<string, StoredCert> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CERTS);
    const parsed = raw ? JSON.parse(raw) : {};
    // Ensure backwards compatibility with any existing stored certs without p12Password
    for (const id in parsed) {
      if (!parsed[id].p12Password) {
        parsed[id].p12Password = DEFAULT_P12_PASSWORD;
      }
    }
    return parsed;
  } catch {
    return {};
  }
}

export function saveStoredCerts(certs: Record<string, StoredCert>) {
  localStorage.setItem(STORAGE_KEY_CERTS, JSON.stringify(certs));
}

export function getSignerP12Password(signerId: string): string {
  const certs = getStoredCerts();
  return certs[signerId]?.p12Password || DEFAULT_P12_PASSWORD;
}

/**
 * Initializes CA and signer certs if not present.
 */
export function ensureInitializedKeys(): {
  ca: CaCertificateData;
  signers: UserKey[];
  certs: Record<string, StoredCert>;
} {
  let ca = getStoredCa();
  if (!ca) {
    const { caData } = createInstitutionCA('Universitas Kuvukiland');
    ca = caData;
    saveStoredCa(ca);
  }

  const caInfo = restoreCaInfo(ca);
  const signers = getStoredSigners();
  const certs = getStoredCerts();

  let certsUpdated = false;
  for (const signer of signers) {
    if (!certs[signer.id]) {
      const userCert = createUserP12Certificate(
        signer.id,
        signer.name,
        signer.role,
        signer.organization || 'Universitas Kuvukiland',
        caInfo
      );
      certs[signer.id] = userCert.storedCert;
      certsUpdated = true;
    } else if (!certs[signer.id].p12Password) {
      certs[signer.id].p12Password = DEFAULT_P12_PASSWORD;
      certsUpdated = true;
    }
  }

  if (certsUpdated) {
    saveStoredCerts(certs);
  }

  return { ca, signers, certs };
}

/**
 * Loads default demo signers (Rektor and Dekan) for rapid testing
 */
export function loadDemoSigners(): { signers: UserKey[]; certs: Record<string, StoredCert> } {
  let ca = getStoredCa();
  if (!ca) {
    const { caData } = createInstitutionCA('Universitas Kuvukiland');
    ca = caData;
    saveStoredCa(ca);
  }
  const caInfo = restoreCaInfo(ca);
  const signers = JSON.parse(JSON.stringify(INITIAL_DEFAULT_SIGNERS)) as UserKey[];
  const certs: Record<string, StoredCert> = {};

  for (const signer of signers) {
    const userCert = createUserP12Certificate(
      signer.id,
      signer.name,
      signer.role,
      signer.organization || 'Universitas Kuvukiland',
      caInfo
    );
    certs[signer.id] = userCert.storedCert;
  }

  saveStoredSigners(signers);
  saveStoredCerts(certs);

  return { signers, certs };
}

/**
 * Re-generates a clean Root CA with custom organization name and clears old signers
 */
export function resetCa(orgName = 'Universitas Kuvukiland'): CaCertificateData {
  const { caData } = createInstitutionCA(orgName);
  saveStoredCa(caData);
  clearStoredSigners();
  return caData;
}

/**
 * Adds a new signer with auto-generated RSA keypair and X.509 cert
 */
export function createNewSigner(
  name: string,
  role: string,
  organization: string,
  email?: string,
  p12Password = DEFAULT_P12_PASSWORD
): { signer: UserKey; cert: StoredCert } {
  let caData = getStoredCa();
  if (!caData) {
    const { caData: newCa } = createInstitutionCA(organization || 'Universitas Kuvukiland');
    caData = newCa;
    saveStoredCa(caData);
  }
  const caInfo = restoreCaInfo(caData);

  const signers = getStoredSigners();
  const certs = getStoredCerts();

  const maxId = signers.reduce((max, s) => {
    const match = s.id.match(/^USR-(\d+)$/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  const id = `USR-${String(maxId + 1).padStart(3, '0')}`;
  const keypair = generateRSAKeyPair();

  const signer: UserKey = {
    id,
    name,
    role,
    organization,
    email,
    publicKey: keypair.publicKey,
    privateKey: keypair.privateKey,
  };

  const userCert = createUserP12Certificate(id, name, role, organization, caInfo, p12Password);

  signers.push(signer);
  certs[id] = userCert.storedCert;

  saveStoredSigners(signers);
  saveStoredCerts(certs);

  return { signer, cert: userCert.storedCert };
}

/**
 * Exports all keys and certs to a standalone portable JSON bundle

 */
export function exportKeyBundle(): string {
  const ca = getStoredCa();
  const signers = getStoredSigners();
  const certs = getStoredCerts();

  if (!ca) throw new Error('CA not found');

  const bundle: KeyBundle = {
    version: '1.0.0',
    ca,
    signers: signers.map((s) => ({
      key: s,
      cert: certs[s.id],
    })),
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(bundle, null, 2);
}

/**
 * Imports keys from a JSON bundle and persists them
 */
export function importKeyBundle(bundleJson: string): { signersCount: number } {
  const bundle: KeyBundle = JSON.parse(bundleJson);
  if (!bundle.ca || !Array.isArray(bundle.signers)) {
    throw new Error('Format bundle kunci tidak valid');
  }

  saveStoredCa(bundle.ca);

  const signers: UserKey[] = [];
  const certs: Record<string, StoredCert> = {};

  for (const item of bundle.signers) {
    if (item.key) {
      signers.push(item.key);
      if (item.cert) {
        certs[item.key.id] = item.cert;
      }
    }
  }

  saveStoredSigners(signers);
  saveStoredCerts(certs);

  return { signersCount: signers.length };
}
