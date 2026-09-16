import forge from 'node-forge';
import type { CaCertificateData, StoredCert } from '../types/keys';

export interface CaCertificateInfo {
  caKeys: forge.pki.rsa.KeyPair;
  caCert: forge.pki.Certificate;
  caAttrs: Array<{ name: string; value: string }>;
}

/**
 * Creates Root Certificate Authority (CA) for an institution
 */
export function createInstitutionCA(organization: string = 'Universitas Kuvukiland'): {
  caInfo: CaCertificateInfo;
  caData: CaCertificateData;
} {
  const pki = forge.pki;
  const caKeys = pki.rsa.generateKeyPair({ bits: 2048, workers: -1 });
  const caCert = pki.createCertificate();
  caCert.publicKey = caKeys.publicKey;
  caCert.serialNumber = '01';
  caCert.validity.notBefore = new Date();
  caCert.validity.notAfter = new Date();
  caCert.validity.notAfter.setFullYear(caCert.validity.notBefore.getFullYear() + 10);

  const caAttrs = [
    { name: 'commonName', value: organization },
    { name: 'organizationName', value: organization },
    { name: 'organizationalUnitName', value: 'Otoritas Sertifikasi Digital' },
    { name: 'countryName', value: 'ID' },
  ];
  caCert.setSubject(caAttrs);
  caCert.setIssuer(caAttrs);
  caCert.setExtensions([
    { name: 'basicConstraints', cA: true },
    { name: 'keyUsage', keyCertSign: true, cRLSign: true, digitalSignature: true },
  ]);
  caCert.sign(caKeys.privateKey, forge.md.sha256.create());

  const caInfo: CaCertificateInfo = { caKeys, caCert, caAttrs };
  const caData: CaCertificateData = {
    organization,
    commonName: organization,
    privateKeyPem: pki.privateKeyToPem(caKeys.privateKey),
    publicKeyPem: pki.publicKeyToPem(caKeys.publicKey),
    caCertPem: pki.certificateToPem(caCert),
    createdAt: new Date().toISOString(),
  };

  return { caInfo, caData };
}

/**
 * Restores CaCertificateInfo from CaCertificateData
 */
export function restoreCaInfo(caData: CaCertificateData): CaCertificateInfo {
  const pki = forge.pki;
  const privateKey = pki.privateKeyFromPem(caData.privateKeyPem);
  const publicKey = pki.publicKeyFromPem(caData.publicKeyPem);
  const caCert = pki.certificateFromPem(caData.caCertPem);
  const caAttrs = caCert.subject.attributes.map((a) => ({
    name: a.name || a.shortName || '',
    value: String(a.value || ''),
  }));

  return {
    caKeys: { privateKey, publicKey },
    caCert,
    caAttrs,
  };
}

export interface UserCertResult {
  p12Bytes: Uint8Array;
  p12Base64: string;
  serialNumber: string;
  certPem: string;
  storedCert: StoredCert;
}

export const DEFAULT_P12_PASSWORD = 'secret_password_123';

/**
 * Issues X.509 PKCS#12 (.p12) certificate for a signer, signed by the CA
 */
export function createUserP12Certificate(
  userId: string,
  name: string,
  role: string,
  organization: string,
  caInfo: CaCertificateInfo,
  password: string = DEFAULT_P12_PASSWORD,
  customSerialNumber?: string
): UserCertResult {
  const pki = forge.pki;
  const userKeys = pki.rsa.generateKeyPair({ bits: 2048, workers: -1 });
  const userCert = pki.createCertificate();
  userCert.publicKey = userKeys.publicKey;

  const serialNumber =
    customSerialNumber ||
    ('02' + Date.now().toString(16) + Math.random().toString(16).slice(2, 6)).toUpperCase();
  userCert.serialNumber = serialNumber;

  userCert.validity.notBefore = new Date();
  userCert.validity.notAfter = new Date();
  userCert.validity.notAfter.setFullYear(userCert.validity.notBefore.getFullYear() + 2);

  const userAttrs = [
    { name: 'commonName', value: name },
    { name: 'organizationName', value: organization },
    { name: 'organizationalUnitName', value: role },
    { name: 'countryName', value: 'ID' },
  ];

  userCert.setSubject(userAttrs);
  userCert.setIssuer(caInfo.caAttrs);

  userCert.setExtensions([
    { name: 'basicConstraints', cA: false },
    {
      name: 'keyUsage',
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
    },
    {
      name: 'extKeyUsage',
      serverAuth: false,
      clientAuth: false,
      codeSigning: false,
      emailProtection: true,
    },
  ]);

  userCert.sign(caInfo.caKeys.privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(userKeys.privateKey, [userCert, caInfo.caCert], password, {
    algorithm: '3des',
    useMac: true,
  });

  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  const p12Base64 = forge.util.encode64(p12Der);

  const bytes = new Uint8Array(p12Der.length);
  for (let i = 0; i < p12Der.length; i++) {
    bytes[i] = p12Der.charCodeAt(i);
  }

  const certPem = pki.certificateToPem(userCert);
  const caCertPem = pki.certificateToPem(caInfo.caCert);

  const storedCert: StoredCert = {
    userId,
    serialNumber,
    p12Base64,
    p12Password: password,
    certPem,
    caCertPem,
    createdAt: new Date().toISOString(),
  };

  return {
    p12Bytes: bytes,
    p12Base64,
    serialNumber,
    certPem,
    storedCert,
  };
}
