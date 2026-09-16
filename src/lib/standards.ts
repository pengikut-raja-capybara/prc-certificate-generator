import type { TemplateConfig } from '../types/template';

/**
 * Standard Canonical Variables for Indonesian & International Certificates
 */
export interface CanonicalVariable {
  key: string;
  label: string;
  example: string;
  category: 'identity' | 'credential' | 'event' | 'institution';
  description: string;
  isRequired?: boolean;
}

export const CANONICAL_VARIABLES: CanonicalVariable[] = [
  {
    key: 'nama',
    label: 'Nama Lengkap Penerima',
    example: 'Ahmad Dahlan, S.Kom., M.T.',
    category: 'identity',
    description: 'Nama lengkap beserta gelar akademik/profesi',
    isRequired: true,
  },
  {
    key: 'nomor_sertifikat',
    label: 'Nomor Sertifikat / Dokumen',
    example: 'CERT-2026-X1-0089',
    category: 'credential',
    description: 'Nomor registrasi unik untuk validasi dokumen',
    isRequired: true,
  },
  {
    key: 'tanggal',
    label: 'Tanggal Penerbitan / Kegiatan',
    example: '15 September 2026',
    category: 'event',
    description: 'Tanggal resmi sertifikat diterbitkan dalam format teks',
    isRequired: true,
  },
  {
    key: 'nim',
    label: 'NIM / NIP / NIK / ID Peserta',
    example: '2026101001',
    category: 'identity',
    description: 'Nomor identitas resmi peserta / mahasiswa / pegawai',
  },
  {
    key: 'institusi',
    label: 'Institusi / Instansi / Universitas',
    example: 'Universitas Kuvukiland',
    category: 'institution',
    description: 'Nama lembaga penerbit sertifikat',
  },
  {
    key: 'kegiatan',
    label: 'Nama Acara / Pelatihan / Workshop',
    example: 'Pelatihan Keamanan Siber & Kriptografi Modern 2026',
    category: 'event',
    description: 'Nama lengkap kegiatan sertifikasi',
  },
  {
    key: 'role',
    label: 'Peran / Partisipasi',
    example: 'Peserta Terbaik / Narasumber / Panitia',
    category: 'credential',
    description: 'Status keikutsertaan penerima',
  },
  {
    key: 'predikat',
    label: 'Predikat / Nilai / Status Kelulusan',
    example: 'Dengan Pujian (Cum Laude)',
    category: 'credential',
    description: 'Peringkat atau nilai capaian',
  },
];

/**
 * Certificate Physical & Digital Standards
 */
export const CERTIFICATE_STANDARDS = {
  // Safe margins in PDF points (1 pt = 1/72 inch, 15mm ≈ 42.5pt, 20mm ≈ 56.7pt)
  SAFE_MARGIN_PT: 42.5, // 15 mm safe inner margin to avoid printer cutoffs
  MIN_PRINT_DPI: 150,
  TARGET_PRINT_DPI: 300,
  EXPORT_CANVAS_SCALE: 2, // 2x gives razor sharp 150-300 DPI print quality

  // Stamp dimensions and proportions
  STAMP: {
    MIN_WIDTH: 140,
    MIN_HEIGHT: 50,
    IDEAL_ASPECT_RATIO_STYLE_A: 2.8, // Formal Academic (wide)
    IDEAL_ASPECT_RATIO_STYLE_B: 1.0, // Centered (square-like)
    IDEAL_ASPECT_RATIO_STYLE_C: 2.2, // Typography
    MIN_QR_SIZE_PT: 36, // Min 36pt (~12.7mm) for physical camera scanner readability
  },

  // Document naming rules
  NAMING: {
    DEFAULT_PREFIX: 'sertifikat',
    ID_PATTERN: /^CERT-[0-9]{4}-[0-9]{3,}$/,
    SAFE_FILENAME_REGEX: /[^a-zA-Z0-9_\-.]/g,
  },
};

/**
 * PAdES Compliance & Cryptographic Standards
 */
export const PADES_STANDARDS = {
  DIGEST_ALGORITHM: 'SHA-256',
  KEY_ALGORITHM: 'RSA-2048',
  SIGNATURE_SUBFILTER: 'adbe.pkcs7.detached',
  DEFAULT_COUNTRY: 'ID',
  DEFAULT_REASON: (role: string, organization: string) =>
    `Pengesahan Dokumen Elektronik oleh ${role} ${organization}`,
};

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a template against official certificate design standards
 */
export function validateTemplateAgainstStandards(template: TemplateConfig): TemplateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check dimension
  if (template.dimensions.width < 300 || template.dimensions.height < 300) {
    errors.push('Dimensi template terlalu kecil untuk standar cetak fisik sertifikat.');
  }

  // Check elements
  const textElements = template.elements.filter(
    (e) => e.type === 'static-text' || e.type === 'dynamic-text'
  );
  if (textElements.length === 0) {
    errors.push('Template harus memiliki minimal satu elemen teks.');
  }

  const stampElements = template.elements.filter((e) => e.type === 'stamp-ttd');
  if (stampElements.length === 0) {
    warnings.push('Template belum memiliki slot Stempel Tanda Tangan Elektronik (TTE).');
  }

  // Check if stamps have signers assigned
  stampElements.forEach((stamp, index) => {
    if (!stamp.signerId) {
      warnings.push(`Slot Stempel TTD #${index + 1} belum dipetakan ke Authorized Signer.`);
    }
  });

  // Check variables
  const hasDynamicName = template.elements.some(
    (e) => e.type === 'dynamic-text' && (e.variable?.includes('nama') || e.text?.includes('nama'))
  );
  if (!hasDynamicName) {
    warnings.push('Disarankan menyertakan variabel {{nama}} untuk memuat nama penerima sertifikat.');
  }

  // Check safe margin overflow
  const margin = CERTIFICATE_STANDARDS.SAFE_MARGIN_PT;
  const w = template.dimensions.width;
  const h = template.dimensions.height;

  for (const el of template.elements) {
    if (el.x < 0 || el.y < 0 || el.x + el.width > w || el.y + el.height > h) {
      warnings.push(`Elemen "${el.name || el.type}" berada sebagian di luar batas kanvas.`);
      break;
    } else if (
      (el.type === 'static-text' || el.type === 'dynamic-text') &&
      (el.x < margin || el.y < margin || el.x + el.width > w - margin || el.y + el.height > h - margin)
    ) {
      warnings.push(`Elemen teks "${el.name || el.type}" mendekati batas tepi (< 15mm batas aman cetak).`);
      break;
    }
  }


  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
