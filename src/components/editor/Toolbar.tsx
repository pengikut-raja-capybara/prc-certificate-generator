import React, { useRef, useState } from 'react';
import { useEditorStore } from '../../stores/editor-store';
import { PdfPreviewModal } from '../shared/PdfPreviewModal';
import {
  Type,
  Variable,
  Image as ImageIcon,
  QrCode,
  Stamp,
  Minus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Undo2,
  Redo2,
  Grid,
  Ruler,
  Download,
  Upload,
  Eye,
  Maximize,
  BoxSelect,
} from 'lucide-react';

import { showErrorAlert } from '../../lib/alerts';
import { triggerDownload } from '../../lib/batch-generator';
import { renderTemplateToBasePdf } from '../../lib/pdf-renderer';

export const Toolbar: React.FC = () => {
  const {
    zoom,
    setZoom,
    undo,
    redo,
    gridEnabled,
    toggleGrid,
    rulerEnabled,
    toggleRuler,
    showSafeMargins,
    toggleSafeMargins,
    addElement,
    template,
    setTemplate,
    setBackgroundImage,
    setPagePreset,
    setBackgroundFit,
  } = useEditorStore();


  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);

  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      const sampleData = {
        nama: 'Prof. Dr. Ir. Ahmad Dahlan, M.T.',
        nomor_sertifikat: 'CERT-GWARRA-2026-PREVIEW',
        prodi: 'Magister Teknik Informatika',
        predikat: 'Dengan Pujian (Cumlaude)',
        tanggal: '11 September 2026',
      };
      const pdfBytes = await renderTemplateToBasePdf(template, sampleData, {
        scale: 2,
        includeDummyStamps: true,
      });
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPreviewPdfUrl(url);
    } catch (err: any) {
      showErrorAlert('Gagal Pratinjau', err?.message);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setBackgroundImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(template, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    triggerDownload(blob, `${template.id || 'template'}.json`);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          setTemplate(parsed);
        } catch (err) {
          showErrorAlert('Format Tidak Valid', 'Format berkas JSON template tidak valid!');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.2rem 0.6rem',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        gap: '0.4rem',
        flexWrap: 'nowrap',
        overflowX: 'auto',
        overflowY: 'hidden',
        minHeight: '40px',
        maxHeight: '40px',
        height: '40px',
        flexShrink: 0,
      }}
    >
      {/* Element creation & Layout tools */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'nowrap', flexShrink: 0 }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => addElement('dynamic-text')}
          title="Tambah Teks Variabel {{...}}"
        >
          <Variable size={15} color="#818cf8" />
          <span>Variabel Dinamis</span>
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => addElement('static-text')}
          title="Tambah Teks Statis"
        >
          <Type size={15} />
          <span>Teks Statis</span>
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => addElement('stamp-ttd')}
          title="Tambah Placeholder Stamp Tanda Tangan"
        >
          <Stamp size={15} color="#34d399" />
          <span>Stamp TTD</span>
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => addElement('qr')}
          title="Tambah QR Code Verifikasi"
        >
          <QrCode size={15} color="#38bdf8" />
          <span>QR Code</span>
        </button>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => addElement('shape')}
          title="Tambah Garis Pembatas"
        >
          <Minus size={15} />
          <span>Garis</span>
        </button>

        <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)', margin: '0 0.15rem' }} />

        {/* Paper Size Preset Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Kertas:</span>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.775rem' }}
            value={template.dimensions.preset || 'A4-landscape'}
            onChange={(e) => setPagePreset(e.target.value as any)}
          >
            <option value="A4-landscape">A4 Landscape (297×210mm)</option>
            <option value="A4-portrait">A4 Portrait (210×297mm)</option>
            <option value="A5-landscape">A5 Landscape (210×148mm)</option>
            <option value="A5-portrait">A5 Portrait (148×210mm)</option>
            <option value="Letter-landscape">Letter Landscape</option>
            <option value="Letter-portrait">Letter Portrait</option>
            <option value="Custom">Kustom</option>
          </select>
        </div>

        {/* Background Fit Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Fit:</span>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.775rem' }}
            value={template.background.fit || 'cover'}
            onChange={(e) => setBackgroundFit(e.target.value as any)}
            title="Mode penyesuaian gambar latar terhadap ukuran sertifikat"
          >
            <option value="cover">Cover (Penuh Rapi)</option>
            <option value="contain">Contain (Muat Utuh)</option>
            <option value="stretch">Stretch (Tarik)</option>
          </select>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={() => fileInputRef.current?.click()}
          title="Ganti Gambar Background Template"
        >
          <ImageIcon size={15} />
          <span>Ganti Latar</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleBgUpload}
          accept="image/png,image/jpeg,image/webp"
          style={{ display: 'none' }}
        />
      </div>

      {/* History, Preview & View Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'nowrap', flexShrink: 0 }}>
        {/* Instant Preview Button on Design Page */}
        <button
          className="btn btn-primary btn-sm"
          onClick={handlePreview}
          disabled={isPreviewing}
          title="Pratinjau Desain Sertifikat dalam Format PDF Cetak"
        >
          <Eye size={14} />
          <span>{isPreviewing ? 'Merender...' : 'Pratinjau Desain'}</span>
        </button>

        <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle)', margin: '0 0.15rem' }} />

        <button className="btn btn-outline btn-sm btn-icon" onClick={undo} title="Undo (Ctrl+Z)">
          <Undo2 size={15} />
        </button>
        <button className="btn btn-outline btn-sm btn-icon" onClick={redo} title="Redo (Ctrl+Y)">
          <Redo2 size={15} />
        </button>

        <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle)', margin: '0 0.15rem' }} />

        <button
          className={`btn btn-sm btn-icon ${gridEnabled ? 'btn-primary' : 'btn-outline'}`}
          onClick={toggleGrid}
          title="Toggle Grid / Kotak Panduan"
        >
          <Grid size={15} />
        </button>

        <button
          className={`btn btn-sm btn-icon ${rulerEnabled ? 'btn-primary' : 'btn-outline'}`}
          onClick={toggleRuler}
          title="Tampilkan / Sembunyikan Penggaris & Garis Panduan"
        >
          <Ruler size={15} />
        </button>

        <button
          className={`btn btn-sm btn-icon ${showSafeMargins ? 'btn-primary' : 'btn-outline'}`}
          onClick={toggleSafeMargins}
          title="Tampilkan / Sembunyikan Margin Aman Cetak (15mm ISO 216)"
        >
          <BoxSelect size={15} />
        </button>


        <button
          className="btn btn-outline btn-sm btn-icon"
          onClick={() => setZoom(zoom - 0.1)}
          title="Perkecil Kanvas"
        >
          <ZoomOut size={15} />
        </button>
        <span style={{ fontSize: '0.75rem', minWidth: '36px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          className="btn btn-outline btn-sm btn-icon"
          onClick={() => setZoom(zoom + 0.1)}
          title="Perbesar Kanvas"
        >
          <ZoomIn size={15} />
        </button>
        <button
          className="btn btn-outline btn-sm btn-icon"
          onClick={() => window.dispatchEvent(new CustomEvent('canvas:fit-to-screen'))}
          title="Pas Layar (Auto-Fit Kanvas)"
          style={{ color: '#38bdf8' }}
        >
          <Maximize size={13} />
        </button>
        <button
          className="btn btn-outline btn-sm btn-icon"
          onClick={() => setZoom(1)}
          title="Reset Zoom 100%"
        >
          <RotateCcw size={13} />
        </button>

        <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle)', margin: '0 0.15rem' }} />

        {/* Template JSON IO */}
        <button className="btn btn-secondary btn-sm" onClick={handleExportJson} title="Simpan Template ke Berkas JSON">
          <Download size={14} />
          <span>Simpan</span>
        </button>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => jsonInputRef.current?.click()}
          title="Muat Template dari Berkas JSON"
        >
          <Upload size={14} />
          <span>Muat</span>
        </button>
        <input
          type="file"
          ref={jsonInputRef}
          onChange={handleImportJson}
          accept=".json"
          style={{ display: 'none' }}
        />
      </div>

      {/* Reusable Instant Design Preview Modal */}
      <PdfPreviewModal
        pdfUrl={previewPdfUrl}
        title="Pratinjau Desain Sertifikat (Format Cetak PDF)"
        fileName="desain-template.pdf"
        onClose={() => {
          if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
          setPreviewPdfUrl(null);
        }}
      />
    </div>
  );
};
