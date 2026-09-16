import React, { useState } from 'react';
import { useEditorStore } from '../../stores/editor-store';
import { useGeneratorStore } from '../../stores/generator-store';
import { useKeysStore } from '../../stores/keys-store';
import { generateBatchCertificates } from '../../lib/batch-generator';
import { PdfPreviewModal } from '../shared/PdfPreviewModal';
import {
  Play,
  CheckCircle,
  Eye,
  FileCheck2,
  Users,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { showSuccessAlert, showErrorAlert } from '../../lib/alerts';
import { ProcessingModal } from '../shared/ProcessingModal';

export const GenerateStep: React.FC = () => {
  const { template } = useEditorStore();
  const { signers } = useKeysStore();
  const {
    batchRows,
    generatedCertificates,
    setGeneratedCertificates,
    isGenerating,
    setIsGenerating,
    progress,
    setProgress,
    institutionName,
    isTemplateDirty,
    nextStep,
    setStep,
  } = useGeneratorStore();


  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('dokumen-dasar.pdf');

  // Assigned signers in template
  const stampElements = template.elements.filter((el) => el.type === 'stamp-ttd');
  const assignedSigners = stampElements.map((el) => {
    const s = signers.find((user) => user.id === el.signerId);
    return {
      id: el.signerId || 'unknown',
      name: s?.name || el.name || 'Authorized Signer',
      role: s?.role || 'Authorized Signer',
      org: s?.organization || institutionName,
    };
  });

  const handleRunBatch = async () => {
    if (batchRows.length === 0) {
      showErrorAlert('Data Kosong', 'Tambahkan data baris terlebih dahulu di Step 2!');
      return;
    }

    setIsGenerating(true);
    setProgress(0, batchRows.length);

    try {
      const certs = await generateBatchCertificates(
        template,
        batchRows,
        signers,
        (current, total) => {
          setProgress(current, total);
        }
      );
      setGeneratedCertificates(certs);
      showSuccessAlert('Generate Berhasil!', `${certs.length} dokumen sertifikat dasar berhasil dibuat dan siap ditandatangani.`);
    } catch (err: any) {
      showErrorAlert('Gagal Generate', `Terjadi kesalahan saat generate batch: ${err?.message}`);
    } finally {
      setIsGenerating(false);
    }
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

  const isGenerated = generatedCertificates.length > 0;

  return (
    <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: '1150px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Header Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                Tahap 3 dari 5
              </span>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Generate Certificate
              </h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
              Kompilasi dokumen dasar sertifikat massal dan penyiapan manifes integritas.
            </p>
          </div>
        </div>

        {/* Stale Invalidation Warning Banner */}
        {isTemplateDirty && isGenerated && (
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <AlertTriangle size={20} color="#f59e0b" />
              <div>
                <div style={{ fontWeight: 600, color: '#f59e0b', fontSize: '0.85rem' }}>
                  Perhatian: Template atau Data Mengalami Perubahan
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Sertifikat yang telah digenerate sebelumnya belum mencerminkan modifikasi terbaru. Klik generate ulang untuk memperbarui berkas.
                </div>
              </div>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleRunBatch}
              disabled={isGenerating}
              style={{
                fontSize: '0.78rem',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                whiteSpace: 'nowrap',
              }}
            >
              Generate Ulang Sekarang
            </button>
          </div>
        )}

        {/* Readiness Checklist Card */}
        <div className="card" style={{ padding: '0.85rem', border: '1px solid var(--border-subtle)' }}>

          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            Kesiapan Dokumen & Parameter Generate
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <FileCheck2 size={16} color="var(--primary-color)" />
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Template Sertifikat:</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {template.name} ({Math.round(template.dimensions.width)} × {Math.round(template.dimensions.height)} pt)
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <Users size={16} color="#10b981" />
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Data Penerima Terdaftar:</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <strong>{batchRows.length}</strong> peserta siap di-generate
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <ShieldCheck size={16} color="#0284c7" />
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Authorized Signer:</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {assignedSigners.length > 0 ? (
                  assignedSigners.map((s, idx) => (
                    <div key={s.id || idx}>
                      {s.name} <span style={{ opacity: 0.7 }}>({s.role})</span>
                    </div>
                  ))
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>Belum ada slot tanda tangan di template</span>
                )}
              </div>
            </div>
          </div>

          {/* Generate Action Button */}
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={handleRunBatch}
                disabled={isGenerating || batchRows.length === 0}
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                <span>
                  {isGenerating
                    ? `Sedang Mengompilasi (${progress.current}/${progress.total})...`
                    : isGenerated
                    ? 'Generate Ulang Sertifikat'
                    : `Generate ${batchRows.length} Sertifikat Sekarang`}
                </span>
              </button>

              {isGenerated && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontSize: '0.85rem' }}>
                  <CheckCircle size={16} />
                  <span>{generatedCertificates.length} dokumen dasar berhasil dibuat dan siap ditandatangani!</span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {isGenerating && (
              <div style={{ width: '100%', background: 'var(--bg-surface)', borderRadius: '999px', height: '10px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                <div
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #0284c7, #2563eb)',
                    width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Results Preview List or Empty State */}
        {isGenerated ? (
          <div className="card" style={{ padding: '0.85rem', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Daftar Dokumen Dihasilkan ({generatedCertificates.length})
              </h3>
            </div>

            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                    <th style={{ padding: '0.4rem 0.6rem', width: '50px' }}>#</th>
                    <th style={{ padding: '0.4rem 0.6rem' }}>Nama Penerima</th>
                    <th style={{ padding: '0.4rem 0.6rem' }}>Nomor Sertifikat</th>
                    <th style={{ padding: '0.4rem 0.6rem' }}>Status Dokumen</th>
                    <th style={{ padding: '0.4rem 0.6rem', width: '110px', textAlign: 'center' }}>Pratinjau</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedCertificates.map((cert, idx) => (
                    <tr key={cert.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.35rem 0.6rem', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '0.35rem 0.6rem', fontWeight: 600 }}>{cert.data['nama'] || '-'}</td>
                      <td style={{ padding: '0.35rem 0.6rem', color: 'var(--text-secondary)' }}>{cert.manifest.documentId}</td>
                      <td style={{ padding: '0.35rem 0.6rem' }}>
                        <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                          Dokumen Dasar (Siap Ditandatangani)
                        </span>
                      </td>
                      <td style={{ padding: '0.35rem 0.6rem', textAlign: 'center' }}>
                        <button
                          className="btn btn-secondary btn-xs"
                          onClick={() => handlePreviewPdf(cert.currentPdfBytes, cert.fileName)}
                        >
                          <Eye size={12} />
                          <span>Preview</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Sparkles size={26} />
            </div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Siap Memulai Pembuatan Dokumen Massal
            </h4>
            <p style={{ maxWidth: '480px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Tekan tombol <strong>"Generate {batchRows.length} Sertifikat Sekarang"</strong> di atas untuk
              mengompilasi berkas PDF berdasar layout canvas dan baris data penerima yang telah diinput.
            </p>
          </div>
        )}

        {/* Lock-Step Bottom Navigation Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem 1rem',
            background: 'var(--bg-surface)',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            marginTop: '0.5rem',
          }}
        >
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setStep(2)}
            style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ArrowLeft size={14} />
            <span>Kembali ke Step 2 (Data)</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {!isGenerated && (
              <span style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertTriangle size={13} />
                <span>Klik "Generate Sertifikat" di atas untuk lanjut ke Signing</span>
              </span>
            )}

            <button
              className="btn btn-primary btn-sm"
              onClick={() => nextStep()}
              disabled={!isGenerated}
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: !isGenerated ? undefined : 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              }}
            >
              <span>Lanjut ke Step 4: Signing PAdES</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Reusable PDF Preview Modal */}
        <PdfPreviewModal
          pdfUrl={previewPdfUrl}
          title="Pratinjau Dokumen Dasar PDF"
          fileName={previewFileName}
          onClose={handleClosePreview}
        />

        {/* Prominent Animated Processing Modal */}
        <ProcessingModal
          isOpen={isGenerating}
          title="Sedang Mengompilasi Dokumen Sertifikat..."
          subtitle={`Merender grafis vektor Fabric, menyisipkan variabel dinamis, dan membuat kode QR verifikasi untuk ${batchRows.length} peserta...`}
          hint="Dokumen dasar PDF dibuat dengan resolusi tinggi (300 DPI) siap untuk ditandatangani."
          progress={progress}
          type="generate"
        />
      </div>
    </div>
  );
};

