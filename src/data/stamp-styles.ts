import type { StampStyleType } from '../types/template';

export interface StampStyleDefinition {
  id: StampStyleType;
  title: string;
  badge: string;
  description: string;
  defaultWidth: number;
  defaultHeight: number;
  features: string[];
}

export const STAMP_STYLES: StampStyleDefinition[] = [
  {
    id: 'A',
    title: 'Style A: Formal Akademik (Dual QR + 4 Baris)',
    badge: 'Rekomendasi Resmi',
    description: 'QR Code di kanan + 4 baris teks identitas rata kanan. QR hanya berisi { nama, noSeri }.',
    defaultWidth: 220,
    defaultHeight: 65,
    features: [
      'QR Code minimalis (nama + noSeri)',
      'Label resmi "Ditandatangani secara elektronik oleh"',
      'Nama Authorized Signer cetak tebal (bold)',
      'Jabatan struktural & institusi',
      'Nomor seri sertifikat X.509 resmi',
    ],
  },
  {
    id: 'B',
    title: 'Style B: Ringkas (QR Tunggal + Nama)',
    badge: 'Modern & Compact',
    description: 'QR Code minimalis di atas dengan nama dan jabatan di bawahnya. QR bersih dan ringkas (hanya nama + no. seri).',
    defaultWidth: 140,
    defaultHeight: 100,
    features: [
      'QR Code bersih di posisi tengah atas',
      'QR ringkas & lega (hanya nama + noSeri)',
      'Nama Authorized Signer tebal di bawah QR',
      'Jabatan ringkas di baris kedua',
      'Ideal untuk sertifikat pelatihan & workshop',
    ],
  },
  {
    id: 'C',
    title: 'Style C: Minimalis (Teks Saja)',
    badge: 'Klasik Tanpa QR',
    description: 'Tampilan bersih tanpa kode QR, cocok untuk surat keputusan, piagam internal, atau dokumen elegan.',
    defaultWidth: 180,
    defaultHeight: 65,
    features: [
      'Tanpa QR Code (bebas distorsi visual)',
      'Nama Authorized Signer tebal dengan tipografi formal',
      'Jabatan struktural dan institusi',
      'Nomor seri tercantum di bagian bawah',
    ],
  },
];
