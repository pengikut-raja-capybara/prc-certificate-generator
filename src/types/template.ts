export type StampStyleType = 'A' | 'B' | 'C';

export type ElementType =
  | 'static-text'
  | 'dynamic-text'
  | 'image'
  | 'qr'
  | 'stamp-ttd'
  | 'shape';

export type PagePreset =
  | 'A4-landscape'
  | 'A4-portrait'
  | 'A5-landscape'
  | 'A5-portrait'
  | 'Letter-landscape'
  | 'Letter-portrait'
  | 'Custom';

export interface PagePresetInfo {
  label: string;
  width: number;
  height: number;
}

export const PAGE_PRESETS: Record<PagePreset, PagePresetInfo> = {
  'A4-landscape': { label: 'A4 Landscape (297 × 210 mm)', width: 842, height: 595.28 },
  'A4-portrait': { label: 'A4 Portrait (210 × 297 mm)', width: 595.28, height: 842 },
  'A5-landscape': { label: 'A5 Landscape (210 × 148 mm)', width: 595.28, height: 420 },
  'A5-portrait': { label: 'A5 Portrait (148 × 210 mm)', width: 420, height: 595.28 },
  'Letter-landscape': { label: 'Letter Landscape (11 × 8.5 in)', width: 792, height: 612 },
  'Letter-portrait': { label: 'Letter Portrait (8.5 × 11 in)', width: 612, height: 792 },
  Custom: { label: 'Kustom (Sesuaikan Sendiri)', width: 842, height: 595.28 },
};

export interface TemplateElement {
  id: string;
  type: ElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  zIndex: number;
  isLocked?: boolean;

  // Text specific
  text?: string;
  variable?: string; // e.g. "{{nama}}", "{{nomor_sertifikat}}"
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic';
  fill?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;

  // Image specific
  src?: string;
  aspectRatio?: number;

  // QR specific
  qrContentTemplate?: string; // e.g. "https://verify.kuvukiland.ac.id/cert/{{nomor_sertifikat}}"
  qrColor?: string;
  qrBackground?: string;

  // Stamp TTD specific
  signerId?: string; // Links to TemplateSigner.id
  stampStyle?: StampStyleType;
  showBorder?: boolean;
}

export interface TemplateSigner {
  id: string; // e.g. "USR-001"
  name: string;
  role: string;
  organization: string;
  email?: string;
  serialNumber?: string;
  stampStyle?: StampStyleType;
  targetPosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface TemplateConfig {
  id: string;
  name: string;
  description?: string;
  dimensions: {
    width: number; // Standard points
    height: number;
    unit: 'pt' | 'px';
    preset?: PagePreset;
  };
  background: {
    type: 'image' | 'color';
    src?: string;
    color?: string;
    fit?: 'cover' | 'contain' | 'stretch';
  };
  elements: TemplateElement[];
  signers: TemplateSigner[];
  createdAt: string;
  updatedAt: string;
}
