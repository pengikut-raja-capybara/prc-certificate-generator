import React, { useRef, useState } from 'react';
import { useEditorStore } from '../../stores/editor-store';
import { useGeneratorStore } from '../../stores/generator-store';
import { useKeysStore } from '../../stores/keys-store';
import { extractTemplateVariables } from '../../lib/pdf-renderer';
import {
  downloadCsvTemplate,
  downloadExcelTemplate,
  parseBatchDataFile,
  generateBatchCertificates,
  downloadAllCertificatesZip,
  triggerDownload,
} from '../../lib/batch-generator';
import {
  FileSpreadsheet,
  FileText,
  Upload,
  Play,
  Package,
  Eye,
  CheckCircle2,
  Plus,
  Trash2,
} from 'lucide-react';
import { showSuccessAlert, showErrorAlert } from '../../lib/alerts';

export const BatchGeneratorView: React.FC = () => {
  const { template } = useEditorStore();
  const { signers } = useKeysStore();
  const {
    batchRows,
    setBatchRows,
    generatedCertificates,
    setGeneratedCertificates,
    isGenerating,
    setIsGenerating,
    progress,
    setProgress,
    setActiveTab,
    setSelectedCertId,
  } = useGeneratorStore();

  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const variables = extractTemplateVariables(template);

  // Handle template download
  const handleDownloadCsv = () => {
    downloadCsvTemplate(template, `${template.id || 'template'}-data.csv`);
  };

  const handleDownloadExcel = () => {
    downloadExcelTemplate(template, `${template.id || 'template'}-data.xlsx`);
  };

  // Handle file import
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await parseBatchDataFile(file);
      if (rows.length === 0) {
        showErrorAlert('File Kosong', 'File data tidak berisi baris yang dapat dibaca.');
        return;
      }
      setBatchRows(rows);
    } catch (err: any) {
      showErrorAlert('Gagal Membaca File', err?.message || 'Format tidak didukung');
    }
  };

  // Run batch generation
  const handleRunBatch = async () => {
    if (batchRows.length === 0) {
      showErrorAlert('Data Kosong', 'Tambahkan data baris terlebih dahulu!');
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
      showSuccessAlert('Generate Berhasil!', `${certs.length} sertifikat berhasil dibuat dan siap diproses.`);
    } catch (err: any) {
      showErrorAlert('Gagal Generate', `Terjadi kesalahan saat generate batch: ${err?.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Download all as ZIP
  const handleDownloadZip = async () => {
    if (generatedCertificates.length === 0) return;
    await downloadAllCertificatesZip(generatedCertificates, `sertifikat-batch-${Date.now()}.zip`);
  };

  // Preview PDF in modal/iframe
  const handlePreviewPdf = (pdfBytes: Uint8Array) => {
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    setPreviewPdfUrl(url);
  };

  const handleDownloadSinglePdf = (cert: any) => {
    const blob = new Blob([cert.currentPdfBytes as any], { type: 'application/pdf' });
    triggerDownload(blob, cert.fileName);
  };

  const handleAddRow = () => {
    const newRow: any = {};
    variables.forEach((v) => {
      newRow[v] = `Data Baru ${batchRows.length + 1}`;
    });
    setBatchRows([...batchRows, newRow]);
  };

  const handleDeleteRow = (index: number) => {
    setBatchRows(batchRows.filter((_, i) => i !== index));
  };

  return (
    <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              Batch Certificate Generator
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Otomatisasi pembuatan sertifikat massal dari data spreadsheet dengan dukungan PAdES Digital Stamp.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleDownloadCsv}>
              <FileText size={15} color="#38bdf8" />
              <span>Download Format CSV</span>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleDownloadExcel}>
              <FileSpreadsheet size={15} color="#34d399" />
              <span>Download Format Excel (.xlsx)</span>
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => fileInputRef.current?.click()}>
              <Upload size={15} />
              <span>Import CSV / Excel</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv, .xlsx, .xls"
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Detected Variables Banner */}
        <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Variabel Terdeteksi di Template:
            </span>
            <span className="badge badge-primary">{variables.length} variabel</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {variables.length > 0 ? (
              variables.map((v) => (
                <span key={v} className="badge badge-muted" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {`{{${v}}}`}
                </span>
              ))
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Belum ada variabel dinamis di template. Buat di tab Template Editor dengan format {'{{nama_variabel}}'}.
              </span>
            )}
          </div>
        </div>

        {/* Data Input Table */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                Daftar Data Peserta ({batchRows.length} baris)
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Edit langsung di tabel ini atau upload file CSV/Excel Anda.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={handleAddRow}>
                <Plus size={14} />
                <span>Tambah Baris</span>
              </button>
              <button
                className="btn btn-success"
                onClick={handleRunBatch}
                disabled={isGenerating || batchRows.length === 0}
              >
                <Play size={16} />
                <span>{isGenerating ? `Memproses (${progress.current}/${progress.total})...` : 'Generate Semua PDF'}</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          {isGenerating && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ height: '6px', width: '100%', background: 'var(--bg-surface-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(progress.current / Math.max(1, progress.total)) * 100}%`,
                    background: 'linear-gradient(90deg, var(--primary), var(--accent))',
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>
                Sedang me-render dokumen {progress.current} dari {progress.total}...
              </span>
            </div>
          )}

          {/* Table Container */}
          <div style={{ overflowX: 'auto', maxHeight: '320px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)', width: '50px' }}>#</th>
                  {variables.map((v) => (
                    <th key={v} style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)' }}>
                      {v}
                    </th>
                  ))}
                  <th style={{ padding: '0.6rem 0.75rem', width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {batchRows.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-muted)' }}>{idx + 1}</td>
                    {variables.map((v) => (
                      <td key={v} style={{ padding: '0.4rem 0.5rem' }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.825rem' }}
                          value={row[v] || ''}
                          onChange={(e) => {
                            const updated = [...batchRows];
                            updated[idx][v] = e.target.value;
                            setBatchRows(updated);
                          }}
                        />
                      </td>
                    ))}
                    <td style={{ padding: '0.4rem 0.5rem', textAlign: 'center' }}>
                      <button
                        className="btn-icon"
                        onClick={() => handleDeleteRow(idx)}
                        style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}
                        title="Hapus Baris"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Generated Results Section */}
        {generatedCertificates.length > 0 && (
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                  Hasil Generate ({generatedCertificates.length} Berkas PDF Siap)
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Berkas dasar berhasil dibuat tanpa stamp tanda tangan. Silakan lanjutkan ke Signing Hub.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary" onClick={() => setActiveTab('signing')}>
                  <span>Lanjut ke Signing Hub</span>
                  <CheckCircle2 size={16} />
                </button>
                <button className="btn btn-secondary" onClick={handleDownloadZip}>
                  <Package size={16} color="#fbbf24" />
                  <span>Download Semua (ZIP)</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {generatedCertificates.map((cert) => (
                <div
                  key={cert.id}
                  className="glass-card"
                  style={{
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <span className="badge badge-primary">{cert.id}</span>
                      <span className="badge badge-muted" style={{ fontSize: '0.7rem' }}>
                        {cert.status === 'base-ready'
                          ? 'Siap Sign'
                          : cert.status === 'fully-signed'
                          ? 'Selesai'
                          : 'Proses'}
                      </span>
                    </div>
                    <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                      {cert.data['nama'] || cert.fileName}
                    </h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      {cert.fileName}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => handlePreviewPdf(cert.currentPdfBytes)}
                    >
                      <Eye size={14} />
                      <span>Preview</span>
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDownloadSinglePdf(cert)}
                      title="Download PDF"
                    >
                      <span>PDF</span>
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setSelectedCertId(cert.id);
                        setActiveTab('signing');
                      }}
                      title="Buka di Signing Hub"
                    >
                      <span>Sign</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* PDF Preview Modal */}
      {previewPdfUrl && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.8)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <div
            style={{
              width: '90%',
              maxWidth: '1000px',
              height: '85%',
              background: 'var(--bg-surface)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)',
            }}
          >
            <div
              style={{
                padding: '0.75rem 1.25rem',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 600 }}>Pratinjau PDF Berkas Sertifikat</span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  URL.revokeObjectURL(previewPdfUrl);
                  setPreviewPdfUrl(null);
                }}
              >
                Tutup
              </button>
            </div>
            <iframe src={previewPdfUrl} style={{ flex: 1, border: 'none', width: '100%', height: '100%' }} />
          </div>
        </div>
      )}
    </div>
  );
};
