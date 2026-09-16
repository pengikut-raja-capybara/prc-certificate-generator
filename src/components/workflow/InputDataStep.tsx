import React, { useRef, useEffect } from 'react';
import { useEditorStore } from '../../stores/editor-store';
import { useGeneratorStore } from '../../stores/generator-store';
import { useKeysStore } from '../../stores/keys-store';
import { extractTemplateVariables } from '../../lib/pdf-renderer';
import {
  downloadCsvTemplate,
  downloadExcelTemplate,
  exportBatchRowsToExcel,
  parseBatchDataFile,
} from '../../lib/batch-generator';
import type { BatchRow } from '../../types/generator';
import {
  FileSpreadsheet,
  FileText,
  Upload,
  Download,
  Plus,
  Trash2,
  Users,
  KeyRound,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { showSuccessToast, showErrorAlert, showConfirmDialog } from '../../lib/alerts';

export const InputDataStep: React.FC = () => {

  const { template, updateElement } = useEditorStore();
  const { signers } = useKeysStore();
  const {
    batchRows,
    setBatchRows,
    loadSampleBatchRows,
    clearBatchRows,
    setIsKeyManagerOpen,
    nextStep,
    setStep,
  } = useGeneratorStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract variables defined on canvas
  const extractedVars = extractTemplateVariables(template);
  const activeVariables = extractedVars.length > 0 ? extractedVars : ['nama', 'nomor_sertifikat'];


  // Identify all stamp elements in template
  const stampElements = template.elements.filter((el) => el.type === 'stamp-ttd');

  // Auto-assign default signer if not set yet to keep store and canvas synchronized
  useEffect(() => {
    stampElements.forEach((el, idx) => {
      if (!el.signerId && signers[idx]) {
        updateElement(el.id, { signerId: signers[idx].id });
      }
    });
  }, [stampElements, signers, updateElement]);

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
      showSuccessToast(`${rows.length} data peserta berhasil diimpor`);
    } catch (err: any) {
      showErrorAlert('Gagal Membaca File', err?.message || 'Format file tidak didukung.');
    }
  };

  // Add empty row
  const handleAddRow = () => {
    const newRow: BatchRow = {};
    activeVariables.forEach((v) => {
      if (v.includes('nomor') || v.includes('no')) {
        newRow[v] = `CERT-2026-${String(batchRows.length + 1).padStart(3, '0')}`;
      } else {
        newRow[v] = '';
      }
    });
    setBatchRows([...batchRows, newRow]);
  };

  // Update cell value
  const handleCellChange = (rowIndex: number, colKey: string, val: string) => {
    const updated = [...batchRows];
    updated[rowIndex] = { ...updated[rowIndex], [colKey]: val };
    setBatchRows(updated);
  };

  // Remove row
  const handleRemoveRow = (rowIndex: number) => {
    setBatchRows(batchRows.filter((_, idx) => idx !== rowIndex));
  };

  const handleClearAllRows = async () => {
    const confirmed = await showConfirmDialog(
      'Kosongkan Seluruh Baris Data?',
      'Semua baris data peserta akan dihapus dari tabel.',
      'Ya, Kosongkan'
    );
    if (confirmed) {
      clearBatchRows();
      showSuccessToast('Data baris peserta berhasil dikosongkan');
    }
  };

  const handleLoadSample = () => {
    loadSampleBatchRows();
    showSuccessToast('3 baris contoh peserta berhasil dimuat');
  };

  return (
    <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: '1150px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* Header Title & Stepper Action */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>Tahap 2 dari 5</span>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Input Data & Authorized Signer
              </h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
              Isi data variabel penerima sertifikat dan tetapkan Authorized Signer Organisasi.
            </p>
          </div>
        </div>

        {/* Section 1: DEFINE SIGNER (Penetapan Authorized Signer) */}
        <div className="card" style={{ padding: '0.85rem', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={16} color="var(--primary-color)" />
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Define Authorized Signer (Penetapan Signer)
              </h3>
            </div>
            <button
              className="btn btn-outline btn-xs"
              onClick={() => setIsKeyManagerOpen(true)}
              style={{ fontSize: '0.75rem' }}
            >
              <KeyRound size={13} />
              <span>Buka Management Key PKI</span>
            </button>
          </div>

          {stampElements.length === 0 ? (
            <div style={{ padding: '1rem', background: 'rgba(234, 179, 8, 0.1)', borderRadius: '8px', border: '1px solid rgba(234, 179, 8, 0.3)', color: '#ca8a04', fontSize: '0.85rem' }}>
              Belum ada slot Stamp TTD di template sertifikat Anda. Kembali ke langkah Set Up Template dan tambahkan tombol "Stamp TTD".
            </div>
          ) : signers.length === 0 ? (
            <div style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                  Belum Ada Authorized Signer Terdaftar di PKI Hub
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Tambahkan Authorized Signer resmi Organisasi atau muat contoh demo agar sertifikat dapat ditandatangani secara digital.
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setIsKeyManagerOpen(true)}
                style={{ fontSize: '0.78rem' }}
              >
                <KeyRound size={13} />
                <span>Buka PKI Hub & Kelola Signer</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              {stampElements.map((stampEl, idx) => {
                const assignedSigner = signers.find((s) => s.id === stampEl.signerId);
                return (
                  <div
                    key={stampEl.id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.6rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        Slot {idx + 1}: {stampEl.name || `Stamp ${idx + 1}`}
                      </span>
                      <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                        Style {stampEl.stampStyle || 'A'}
                      </span>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>
                        Pilih Authorized Signer:
                      </label>
                      <select
                        className="form-select"
                        style={{ fontSize: '0.82rem' }}
                        value={stampEl.signerId || signers[idx]?.id || ''}
                        onChange={(e) => updateElement(stampEl.id, { signerId: e.target.value })}
                      >
                        <option value="">-- Pilih Authorized Signer --</option>{signers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} - {s.role} ({s.organization || 'Universitas'})
                          </option>
                        ))}
                      </select>
                    </div>


                    {assignedSigner && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CheckCircle size={13} color="#10b981" />
                        <span>Kunci X.509 PKI aktif: {assignedSigner.email || assignedSigner.id}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2: INPUT LIST ALL VARIABLE DATA */}
        <div className="card" style={{ padding: '0.85rem', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileSpreadsheet size={16} color="var(--primary-color)" />
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Data Baris Peserta ({batchRows.length} Baris)
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Variabel Aktif Template:</span>
                {activeVariables.map((v) => (
                  <span key={v} className="badge badge-outline" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            </div>

            {/* Template Download & Upload Actions */}
            <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleLoadSample}
                title="Muat 3 data peserta contoh demo"
                style={{ fontSize: '0.78rem' }}
              >
                <Sparkles size={14} color="#6366f1" />
                <span>Muat Contoh Demo (3 Baris)</span>
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => fileInputRef.current?.click()}
                style={{ fontSize: '0.78rem' }}
              >
                <Upload size={14} />
                <span>Upload Excel / CSV</span>
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => downloadExcelTemplate(template, `${template.id || 'template'}-data.xlsx`)}
                title="Download file Excel template sesuai kolom variabel"
                style={{ fontSize: '0.78rem' }}
              >
                <FileSpreadsheet size={14} />
                <span>Format Excel (.xlsx)</span>
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => downloadCsvTemplate(template, `${template.id || 'template'}-data.csv`)}
                title="Download file CSV template"
                style={{ fontSize: '0.78rem' }}
              >
                <FileText size={14} />
                <span>Format CSV (.csv)</span>
              </button>
              {batchRows.length > 0 && (
                <>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => exportBatchRowsToExcel(batchRows, activeVariables, `${template.id || 'batch'}-data-peserta.xlsx`)}
                    title="Ekspor seluruh baris data peserta ke berkas Excel (.xlsx)"
                    style={{ fontSize: '0.78rem' }}
                  >
                    <Download size={14} />
                    <span>Ekspor (.xlsx)</span>
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={handleClearAllRows}
                    title="Kosongkan seluruh baris peserta"
                    style={{ fontSize: '0.78rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                  >
                    <Trash2 size={14} />
                    <span>Kosongkan Tabel</span>
                  </button>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>
          </div>

          {/* Interactive Dynamic Data Table / Empty State */}
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
            {batchRows.length === 0 ? (
              <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', background: 'var(--bg-surface)' }}>
                <FileSpreadsheet size={36} color="var(--primary-color)" style={{ margin: '0 auto 0.75rem', opacity: 0.8 }} />
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Tabel Data Peserta Masih Kosong (Default)
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 1.25rem' }}>
                  Belum ada baris peserta yang dimasukkan. Anda dapat mengunggah berkas Excel/CSV, menambah baris manual, atau memuat 3 baris data demo.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-outline btn-sm" onClick={handleAddRow} style={{ fontSize: '0.78rem' }}>
                    <Plus size={14} />
                    <span>+ Tambah Baris Manual</span>
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => fileInputRef.current?.click()} style={{ fontSize: '0.78rem' }}>
                    <Upload size={14} />
                    <span>Upload Excel / CSV</span>
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={handleLoadSample} style={{ fontSize: '0.78rem' }}>
                    <Sparkles size={14} color="#6366f1" />
                    <span>Muat Contoh Demo (3 Peserta)</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                        <th style={{ padding: '0.4rem 0.6rem', width: '40px', color: 'var(--text-muted)', fontWeight: 600 }}>#</th>
                        {activeVariables.map((colKey) => (
                          <th key={colKey} style={{ padding: '0.4rem 0.6rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            {colKey}
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', fontWeight: 400 }}>
                              {`{{${colKey}}}`}
                            </span>
                          </th>
                        ))}
                        <th style={{ padding: '0.4rem 0.6rem', width: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchRows.map((row, rowIdx) => (
                        <tr
                          key={rowIdx}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            background: rowIdx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                          }}
                        >
                          <td style={{ padding: '0.35rem 0.6rem', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                            {rowIdx + 1}
                          </td>
                          {activeVariables.map((colKey) => (
                            <td key={colKey} style={{ padding: '0.25rem 0.4rem' }}>
                              <input
                                type="text"
                                className="form-input"
                                style={{ padding: '0.25rem 0.4rem', fontSize: '0.78rem', width: '100%' }}
                                value={row[colKey] ?? ''}
                                onChange={(e) => handleCellChange(rowIdx, colKey, e.target.value)}
                                placeholder={`Isi ${colKey}...`}
                              />
                            </td>
                          ))}
                          <td style={{ padding: '0.25rem 0.4rem', textAlign: 'center' }}>
                            <button
                              className="btn btn-outline btn-xs"
                              onClick={() => handleRemoveRow(rowIdx)}
                              title="Hapus baris"
                              style={{ color: '#ef4444', borderColor: 'transparent', padding: '0.25rem' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer Controls */}
                <div
                  style={{
                    padding: '0.4rem 0.75rem',
                    background: 'var(--bg-surface)',
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <button className="btn btn-outline btn-sm" onClick={handleAddRow} style={{ fontSize: '0.78rem' }}>
                    <Plus size={14} />
                    <span>Tambah Baris Peserta</span>
                  </button>

                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Total: <strong style={{ color: 'var(--text-primary)' }}>{batchRows.length}</strong> peserta terdaftar
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

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
            onClick={() => setStep(1)}
            style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <ArrowLeft size={14} />
            <span>Kembali ke Step 1 (Template)</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {batchRows.length === 0 && (
              <span style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <AlertTriangle size={13} />
                <span>Masukkan minimal 1 data peserta untuk lanjut</span>
              </span>
            )}

            <button
              className="btn btn-primary btn-sm"
              onClick={() => nextStep()}
              disabled={batchRows.length === 0}
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: batchRows.length === 0 ? undefined : 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              }}
            >
              <span>Lanjut ke Step 3: Generate Dokumen</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

