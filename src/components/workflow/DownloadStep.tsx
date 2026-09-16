import React, { useState } from 'react';
import { useGeneratorStore } from '../../stores/generator-store';
import { useEditorStore } from '../../stores/editor-store';
import { downloadAllCertificatesZip, triggerDownload } from '../../lib/batch-generator';
import { PdfPreviewModal } from '../shared/PdfPreviewModal';
import { clearAllAppData } from '../../lib/storage';
import {
  Download,
  Package,
  Eye,
  ArrowLeft,
  CheckCircle2,
  Key,
  RotateCcw,
} from 'lucide-react';
import { showSuccessToast, showErrorAlert, showBatchResetOptionsDialog } from '../../lib/alerts';

export const DownloadStep: React.FC = () => {
  const { generatedCertificates, setStep, startNewBatch, resetGeneratorData } = useGeneratorStore();
  const { resetTemplate } = useEditorStore();
  const [isZipping, setIsZipping] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('sertifikat-sah.pdf');

  const handleNewBatch = async () => {
    const choice = await showBatchResetOptionsDialog();
    if (!choice) return;

    if (choice === 'keep_template') {
      startNewBatch(true);
      showSuccessToast('Batch baru dimulai: Data peserta & sertifikat di-reset. Template tetap dipertahankan.');
    } else if (choice === 'reset_all') {
      await clearAllAppData();
      resetGeneratorData();
      resetTemplate();
      setStep(1);
      showSuccessToast('Alur kerja berhasil di-reset penuh ke Step 1.');
    }
  };

  const total = generatedCertificates.length;
  const fullySigned = generatedCertificates.filter((c) => c.status === 'fully-signed').length;
  const partiallySigned = generatedCertificates.filter((c) => c.status === 'partially-signed').length;

  const handleDownloadAllZip = async () => {
    if (total === 0) return;
    setIsZipping(true);
    try {
      await downloadAllCertificatesZip(
        generatedCertificates,
        `sertifikat-resmi-batch-${Date.now()}.zip`
      );
      showSuccessToast(`Berhasil mengunduh ZIP (${total} sertifikat)`);
    } catch (err: any) {
      showErrorAlert('Gagal Mengunduh', `Gagal membuat ZIP: ${err?.message}`);
    } finally {
      setIsZipping(false);
    }
  };

  const handleDownloadSinglePdf = (cert: any) => {
    const blob = new Blob([cert.currentPdfBytes as any], { type: 'application/pdf' });
    triggerDownload(blob, cert.fileName || `${cert.id}.pdf`);
  };

  const handlePreviewPdf = (pdfBytes: Uint8Array, fileName: string) => {
    if (!pdfBytes || pdfBytes.length === 0) return;
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    setPreviewFileName(fileName);
    setPreviewPdfUrl(url);
  };

  const handleClosePreview = () => {
    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl);
      setPreviewPdfUrl(null);
    }
  };

  return (
    <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: '1150px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Header Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                Tahap 5: Selesai
              </span>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Download Sertifikat Sah
              </h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              Seluruh sertifikat telah selesai diproses dan siap didistribusikan kepada peserta.
            </p>
          </div>
        </div>

        {total === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Package size={26} />
            </div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Belum Ada Sertifikat Yang Siap Diunduh
            </h4>
            <p style={{ maxWidth: '480px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Belum ada berkas sertifikat yang digenerate dan ditandatangani. Silakan ikuti alur mulai dari
              Input Data dan Generate terlebih dahulu.
            </p>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setStep(3)}
              style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <ArrowLeft size={14} />
              <span>Ke Step 3: Generate Certificate</span>
            </button>
          </div>
        ) : (
          <>
            {/* Hero Download Card */}
            <div
              className="card"
              style={{
                padding: '1.25rem',
                border: '1px solid var(--border-subtle)',
                background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(37, 99, 235, 0.05) 100%)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', marginBottom: '0.35rem' }}>
                  <CheckCircle2 size={18} />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Sertifikat Siap Diunduh</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', maxWidth: '620px', lineHeight: 1.4 }}>
                  Paket ZIP memuat seluruh berkas PDF beresolusi tinggi beserta manifes integritas kriptografis <code style={{ fontSize: '0.75rem', background: 'var(--bg-surface)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>.sig.json</code>.
                </p>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-success" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}>
                    ✓ {fullySigned} Sah Penuh (Semua Authorized Signer)
                  </span>
                  {partiallySigned > 0 && (
                    <span className="badge badge-warning" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}>
                      ⏳ {partiallySigned} Sebagian TTD
                    </span>
                  )}
                  <span className="badge badge-outline" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Key size={12} />
                    <span>Password & Manifes Tersemat di .sig.json</span>
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleNewBatch}
                  style={{ padding: '0.6rem 1.1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <RotateCcw size={16} />
                  <span>Buat Batch Baru</span>
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleDownloadAllZip}
                  disabled={isZipping || total === 0}
                  style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Package size={20} />
                  <span>{isZipping ? 'Mengemas ZIP...' : `Download Semua ZIP (${total} Sertifikat)`}</span>
                </button>
              </div>
            </div>

            {/* Certificate Table List */}
            <div className="card" style={{ padding: '0.85rem', border: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                Daftar Berkas Individual ({total} Berkas)
              </h3>

              <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                      <th style={{ padding: '0.4rem 0.6rem', width: '50px' }}>#</th>
                      <th style={{ padding: '0.4rem 0.6rem' }}>Nama Penerima</th>
                      <th style={{ padding: '0.4rem 0.6rem' }}>Nomor Dokumen</th>
                      <th style={{ padding: '0.4rem 0.6rem' }}>Status Pengesahan</th>
                      <th style={{ padding: '0.4rem 0.6rem', textAlign: 'center', width: '180px' }}>Aksi Unduh / Preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedCertificates.map((cert, idx) => {
                      const isFull = cert.status === 'fully-signed';
                      return (
                        <tr key={cert.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td style={{ padding: '0.4rem 0.6rem', fontWeight: 600 }}>{cert.data['nama'] || cert.id}</td>
                          <td style={{ padding: '0.4rem 0.6rem', color: 'var(--text-secondary)' }}>{cert.manifest.documentId}</td>
                          <td style={{ padding: '0.4rem 0.6rem' }}>
                            <span
                              className={`badge ${isFull ? 'badge-success' : 'badge-warning'}`}
                              style={{ fontSize: '0.7rem' }}
                            >
                              {isFull ? 'Sah Penuh' : `${cert.signedBy.length} Tanda Tangan`}
                            </span>
                          </td>
                          <td style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                              <button
                                className="btn btn-secondary btn-xs"
                                onClick={() => handlePreviewPdf(cert.currentPdfBytes, cert.fileName)}
                                title="Pratinjau PDF"
                              >
                                <Eye size={12} />
                                <span>Preview</span>
                              </button>
                              <button
                                className="btn btn-primary btn-xs"
                                onClick={() => handleDownloadSinglePdf(cert)}
                                title="Download PDF ini"
                              >
                                <Download size={12} />
                                <span>PDF</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* New Batch Callout Card */}
            <div
              className="card"
              style={{
                padding: '1rem 1.25rem',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                  Ingin Memproses Batch Sertifikat Lainnya?
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Buat batch sertifikat baru untuk daftar peserta berbeda. Anda dapat memilih untuk mempertahankan desain template saat ini atau mereset dari awal.
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleNewBatch}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 1rem',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                }}
              >
                <RotateCcw size={14} />
                <span>Mulai Batch Baru</span>
              </button>
            </div>
          </>
        )}

        {/* Reusable PDF Preview Modal */}
        <PdfPreviewModal
          pdfUrl={previewPdfUrl}
          title="Pratinjau Sertifikat Sah"
          fileName={previewFileName}
          onClose={handleClosePreview}
        />
      </div>
    </div>
  );
};
