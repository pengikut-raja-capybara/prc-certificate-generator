import React, { useState } from 'react';
import { useEditorStore } from '../../stores/editor-store';
import { useGeneratorStore } from '../../stores/generator-store';
import { useKeysStore } from '../../stores/keys-store';
import {
  batchSignAllCertificates,
  verifyCertificateIntegrity,
} from '../../lib/signing-pipeline';
import { PdfPreviewModal } from '../shared/PdfPreviewModal';
import { ProcessingModal } from '../shared/ProcessingModal';
import {
  FileSignature,
  Eye,
  ArrowLeft,
  ShieldCheck,
  Users,
  FileCheck2,
  Loader2,
} from 'lucide-react';
import { showSuccessAlert, showErrorAlert } from '../../lib/alerts';

export const SigningStep: React.FC = () => {
  const { template } = useEditorStore();
  const { signers, certs, getSignerPassword } = useKeysStore();
  const {
    generatedCertificates,
    setGeneratedCertificates,
    selectedCertId,
    setSelectedCertId,
    institutionName,
    setStep,
  } = useGeneratorStore();

  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [signingSignerId, setSigningSignerId] = useState<string | null>(null);
  const [signingSignerName, setSigningSignerName] = useState<string>('');
  const [signingProgress, setSigningProgress] = useState<{ current: number; total: number } | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('sertifikat-signed.pdf');

  // Template stamp elements
  const stampElements = template.elements.filter((el) => el.type === 'stamp-ttd');
  const assignedSigners = stampElements.map((el) => {
    return (
      signers.find((s) => s.id === el.signerId) || {
        id: el.signerId || 'unknown',
        name: el.name || 'Authorized Signer',
        role: 'Authorized Signer',
        organization: institutionName || 'Organisasi Penerbit',
      }
    );
  });

  const selectedCert =
    generatedCertificates.find((c) => c.id === selectedCertId) ||
    generatedCertificates[0];

  // 1-Click Batch Sign All for a specific signer
  const handleBatchSignAll = (signerIdToSign: string) => {
    const signer = signers.find((s) => s.id === signerIdToSign);
    if (!signer) {
      showErrorAlert('Gagal', 'Authorized Signer tidak ditemukan!');
      return;
    }

    const storedCert = certs[signerIdToSign];
    if (!storedCert) {
      showErrorAlert('Kunci Belum Ada', `Sertifikat X.509 PKCS#12 untuk ${signer.name} belum tersedia di Key Management.`);
      return;
    }

    // Find stamp position for this signer
    const stampEl =
      template.elements.find((el) => el.type === 'stamp-ttd' && el.signerId === signer.id) ||
      template.elements.find((el) => el.type === 'stamp-ttd');

    const stampPosition = {
      x: stampEl?.x || 230,
      y: stampEl?.y || 475,
      width: stampEl?.width || 220,
      height: stampEl?.height || 65,
      style: stampEl?.stampStyle || 'A',
    };

    const p12Password = getSignerPassword(signer.id);

    setIsSigning(true);
    setSigningSignerId(signer.id);
    setSigningSignerName(signer.name);
    setSigningProgress({ current: 0, total: generatedCertificates.length });

    setTimeout(async () => {
      try {
        const updatedList = await batchSignAllCertificates({
          certificates: generatedCertificates,
          signer,
          storedCert,
          p12Password,
          institutionName: signer.organization || institutionName || 'Organisasi Penerbit',
          stampPosition,
          pageHeight: template.dimensions.height,
          allUsers: signers,
          totalExpectedSigners: stampElements.length || 1,
          onProgress: (current, total) => {
            setSigningProgress({ current, total });
          },
        });

        setGeneratedCertificates(updatedList);

        const allFullySigned = updatedList.every((c) => c.status === 'fully-signed');
        if (allFullySigned) {
          showSuccessAlert('Penandatanganan Lengkap!', 'Seluruh dokumen sertifikat telah berhasil ditandatangani oleh semua Authorized Signer Organisasi (Sah Penuh).');
        } else {
          showSuccessAlert('Tanda Tangan Berhasil', `Dokumen berhasil ditandatangani oleh ${signer.name}.`);
        }
      } catch (err: any) {
        console.error('Batch sign error:', err);
        showErrorAlert('Gagal Signing', `Gagal batch signing: ${err?.message}`);
      } finally {
        setIsSigning(false);
        setSigningSignerId(null);
        setSigningProgress(null);
      }
    }, 50);
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

  const verification = selectedCert?.manifest?.signatures
    ? verifyCertificateIntegrity(selectedCert.currentPdfBytes, selectedCert.manifest, signers)
    : null;

  const totalCerts = generatedCertificates.length;
  const fullySignedCount = generatedCertificates.filter((c) => c.status === 'fully-signed').length;

  return (
    <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: '1150px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Header Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                Tahap 4 dari 5
              </span>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Signing (PAdES Digital Stamp)
              </h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
              Penandatanganan digital bertingkat PAdES dengan stempel kriptografis X.509.
            </p>
          </div>
        </div>

        {totalCerts === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileCheck2 size={26} />
            </div>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Belum Ada Dokumen Untuk Ditandatangani
            </h4>
            <p style={{ maxWidth: '480px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Dokumen sertifikat dasar belum dibuat. Silakan kembali ke langkah Generate Certificate untuk
              mengompilasi berkas PDF terlebih dahulu.
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
            {/* Section: ALL SIGNER SIGNING (Batch Sign 1-Click Cards) */}
            <div className="card" style={{ padding: '0.85rem', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={16} color="var(--primary-color)" />
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Eksekusi Tanda Tangan Massal
                  </h3>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Progres Keseluruhan:{' '}
                  <strong style={{ color: '#10b981' }}>{fullySignedCount}</strong> dari {totalCerts} selesai ditandatangani
                </span>
              </div>

              {signers.length === 0 ? (
                <div style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                      Belum Ada Authorized Signer Terdaftar di PKI Hub
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Tambahkan Authorized Signer atau muat contoh demo di menu Keys PKI untuk menandatangani dokumen ini.
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => useGeneratorStore.getState().setIsKeyManagerOpen(true)}
                    style={{ fontSize: '0.78rem' }}
                  >
                    Buka Keys PKI
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0.75rem' }}>
                  {assignedSigners.map((signer) => {
                    const signedForThisSigner = generatedCertificates.filter((c) =>
                      c.signedBy.includes(signer.id)
                    ).length;
                    const isAllSignedForSigner = signedForThisSigner === totalCerts && totalCerts > 0;


                  return (
                    <div
                      key={signer.id}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        padding: '0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            {signer.name}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {signer.role} • {signer.organization || institutionName || 'Universitas'}
                          </div>
                        </div>
                        <span
                          className={`badge ${isAllSignedForSigner ? 'badge-success' : 'badge-warning'}`}
                          style={{ fontSize: '0.7rem' }}
                        >
                          {signedForThisSigner} / {totalCerts} Ditandatangani
                        </span>
                      </div>

                      {/* Progress Bar for this signer */}
                      <div style={{ width: '100%', background: 'var(--bg-base)', borderRadius: '999px', height: '6px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            background: isAllSignedForSigner ? '#10b981' : 'var(--primary-color, #6366f1)',
                            width: `${totalCerts > 0 ? (signedForThisSigner / totalCerts) * 100 : 0}%`,
                          }}
                        />
                      </div>

                      {/* 1-Click Batch Sign Button */}
                      <button
                        className={`btn ${isAllSignedForSigner ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                        onClick={() => handleBatchSignAll(signer.id)}
                        disabled={isSigning || isAllSignedForSigner || totalCerts === 0}
                        style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                      >
                        {isSigning && signingSignerId === signer.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <FileSignature size={14} />
                        )}
                        <span>
                          {isSigning && signingSignerId === signer.id
                            ? 'Sedang Memproses Tanda Tangan...'
                            : isAllSignedForSigner
                            ? 'Semua Dokumen Sudah Ditandatangani'
                            : `Tandatangani Semua Dokumen (${totalCerts - signedForThisSigner} Dokumen)`}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
              )}

              {/* Live Progress Bar when signing */}
              {signingProgress && (
                <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-base)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                    <span>Sedang menandatangani dokumen...</span>
                    <span>{signingProgress.current} / {signingProgress.total}</span>
                  </div>
                  <div style={{ width: '100%', background: 'var(--bg-surface)', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        background: 'linear-gradient(90deg, #0284c7, #10b981)',
                        width: `${(signingProgress.current / signingProgress.total) * 100}%`,
                        transition: 'width 0.15s ease',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section: Dokumen & Inspeksi Kriptografis */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', alignItems: 'flex-start' }}>
              {/* Left: Certificate Table */}
              <div className="card" style={{ padding: '0.85rem', border: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  Daftar Dokumen ({generatedCertificates.length})
                </h3>
                <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden', maxHeight: '380px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                        <th style={{ padding: '0.4rem 0.6rem' }}>Nama</th>
                        <th style={{ padding: '0.4rem 0.6rem' }}>Status</th>
                        <th style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generatedCertificates.map((cert) => {
                        const isSelected = cert.id === selectedCert?.id;
                        const isFull = cert.status === 'fully-signed';
                        return (
                          <tr
                            key={cert.id}
                            className="table-row-hover"
                            onClick={() => setSelectedCertId(cert.id)}
                            style={{
                              borderBottom: '1px solid var(--border-subtle)',
                              background: isSelected ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
                              cursor: 'pointer',
                            }}
                          >
                            <td style={{ padding: '0.35rem 0.6rem', fontWeight: 600 }}>{cert.data['nama'] || cert.id}</td>
                            <td style={{ padding: '0.35rem 0.6rem' }}>
                              <span
                                className={`badge ${isFull ? 'badge-success' : cert.signedBy.length > 0 ? 'badge-info' : 'badge-warning'}`}
                                style={{ fontSize: '0.68rem' }}
                              >
                                {isFull ? 'Sah Penuh' : `${cert.signedBy.length} TTD`}
                              </span>
                            </td>
                            <td style={{ padding: '0.35rem 0.6rem', textAlign: 'center' }}>
                              <button
                                className="btn btn-secondary btn-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePreviewPdf(cert.currentPdfBytes, cert.fileName);
                                }}
                              >
                                <Eye size={11} />
                                <span>Lihat</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right: Selected Document Detail & Verification */}
              {selectedCert && (
                <div className="card" style={{ padding: '0.85rem', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Detail Sertifikat Terpilih
                    </h3>
                    <span className="badge badge-outline" style={{ fontSize: '0.7rem' }}>
                      {selectedCert.manifest.documentId}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Penerima: <strong style={{ color: 'var(--text-primary)' }}>{selectedCert.data['nama']}</strong>
                  </div>

                  {/* Signers Status List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.75rem' }}>
                    {assignedSigners.map((s) => {
                      const hasSigned = selectedCert.signedBy.includes(s.id);
                      return (
                        <div
                          key={s.id}
                          style={{
                            padding: '0.4rem 0.6rem',
                            borderRadius: '5px',
                            background: hasSigned ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-surface)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.78rem',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600 }}>{s.name}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{s.role}</div>
                          </div>
                          <span className={`badge ${hasSigned ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.68rem' }}>
                            {hasSigned ? 'Sudah TTD' : 'Belum TTD'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Cryptographic Manifest info */}
                  {verification && (
                    <div style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-base)', borderRadius: '6px', border: '1px solid var(--border-subtle)', fontSize: '0.75rem' }}>
                      <div style={{ fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem' }}>
                        <ShieldCheck size={14} />
                        <span>Integritas Kriptografis Terverifikasi</span>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                        SHA-256: {selectedCert.manifest.fileHash?.slice(0, 24)}...
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Processing Modal for Signing */}
        <ProcessingModal
          isOpen={isSigning}
          title="Menandatangani Dokumen secara Digital (PAdES)..."
          subtitle={
            signingSignerName
              ? `Menerapkan stempel visual dan enkripsi signature SHA-256 RSA-2048 oleh ${signingSignerName}...`
              : 'Sedang membubuhkan tanda tangan digital kriptografis...'
          }
          type="signing"
          progress={signingProgress || undefined}
          hint="Setiap PDF dienkripsi dengan private key Authorized Signer dan di-embed dengan sertifikat X.509."
        />

        {/* Reusable PDF Preview Modal */}
        <PdfPreviewModal
          pdfUrl={previewPdfUrl}
          title="Pratinjau Dokumen Ditandatangani"
          fileName={previewFileName}
          onClose={handleClosePreview}
        />
      </div>
    </div>
  );
};
