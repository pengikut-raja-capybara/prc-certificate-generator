import React, { useState, useEffect } from 'react';
import { useGeneratorStore } from '../../stores/generator-store';
import { useKeysStore } from '../../stores/keys-store';
import { useEditorStore } from '../../stores/editor-store';
import { executeSigningStep, verifyCertificateIntegrity } from '../../lib/signing-pipeline';
import { triggerDownload } from '../../lib/batch-generator';
import { ProcessingModal } from '../shared/ProcessingModal';
import {
  CheckCircle,
  Clock,
  ShieldCheck,
  FileCheck,
  Eye,
  Download,
  Send,
  Loader2,
} from 'lucide-react';
import { showSuccessAlert, showErrorAlert } from '../../lib/alerts';

export const SigningView: React.FC = () => {
  const { template } = useEditorStore();
  const { signers, certs } = useKeysStore();
  const {
    generatedCertificates,
    selectedCertId,
    setSelectedCertId,
    updateCertificate,
  } = useGeneratorStore();

  const [activeSignerId, setActiveSignerId] = useState<string>(signers[0]?.id || '');
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!activeSignerId || !signers.some((s) => s.id === activeSignerId)) {
      setActiveSignerId(signers[0]?.id || '');
    }
  }, [signers, activeSignerId]);

  const selectedCert =
    generatedCertificates.find((c) => c.id === selectedCertId) ||
    generatedCertificates[0];

  const activeSigner = signers.find((s) => s.id === activeSignerId);

  const handleSignDocument = () => {
    if (!selectedCert) return;

    const signer = signers.find((s) => s.id === activeSignerId);
    if (!signer) {
      showErrorAlert('Gagal', 'Authorized Signer tidak ditemukan!');
      return;
    }

    const storedCert = certs[activeSignerId];
    if (!storedCert) {
      showErrorAlert('Kunci Belum Ada', `Sertifikat X.509 PKCS#12 untuk ${signer.name} belum tersedia di Key Management.`);
      return;
    }

    // Check if already signed by this signer
    if (selectedCert.signedBy.includes(signer.id)) {
      showErrorAlert('Sudah Ditandatangani', `Authorized Signer ${signer.name} (${signer.role}) sudah menandatangani dokumen ini.`);
      return;
    }

    // Find stamp position from template
    const stampEl = template.elements.find(
      (el) => el.type === 'stamp-ttd' && el.signerId === signer.id
    ) || template.elements.find((el) => el.type === 'stamp-ttd');

    const stampPosition = {
      x: stampEl?.x || 100,
      y: stampEl?.y || 450,
      width: stampEl?.width || 220,
      height: stampEl?.height || 65,
      style: stampEl?.stampStyle || 'A',
    };

    setIsSigning(true);
    setTimeout(async () => {
      try {
        const { signedPdfBytes, updatedManifest } = await executeSigningStep({
          certificate: selectedCert,
          signer,
          storedCert,
          p12Password: 'secret_password_123',
          institutionName: signer.organization || 'Organisasi Penerbit',
          stampPosition,
          pageHeight: template.dimensions.height,
          allUsers: signers,
        });

        const updatedSignedBy = [...selectedCert.signedBy, signer.id];
        const isFullySigned = updatedSignedBy.length >= template.signers.length;

        updateCertificate(selectedCert.id, {
          currentPdfBytes: signedPdfBytes,
          manifest: updatedManifest,
          signedBy: updatedSignedBy,
          status: isFullySigned ? 'fully-signed' : 'partially-signed',
        });

        if (isFullySigned) {
          showSuccessAlert('Dokumen Sah Penuh!', `Sertifikat ${selectedCert.manifest.documentId} telah ditandatangani oleh semua Authorized Signer Organisasi.`);
        } else {
          showSuccessAlert('Berhasil Ditandatangani', `Tanda tangan digital oleh ${signer.name} berhasil disematkan.`);
        }
      } catch (err: any) {
        console.error('Signing error:', err);
        showErrorAlert('Gagal Menandatangani', err?.message || 'Error tidak terduga');
      } finally {
        setIsSigning(false);
      }
    }, 50);
  };

  const handlePreview = (bytes: Uint8Array) => {
    const blob = new Blob([bytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    setPreviewPdfUrl(url);
  };

  const handleDownloadPdf = (cert: any) => {
    const blob = new Blob([cert.currentPdfBytes as any], { type: 'application/pdf' });
    triggerDownload(blob, cert.fileName);
  };

  const handleDownloadManifest = (cert: any) => {
    const blob = new Blob([JSON.stringify(cert.manifest, null, 2)], {
      type: 'application/json',
    });
    triggerDownload(blob, `${cert.fileName}.sig.json`);
  };

  // Verification
  const verification = selectedCert
    ? verifyCertificateIntegrity(
        selectedCert.currentPdfBytes,
        selectedCert.manifest,
        signers
      )
    : null;

  return (
    <div style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Left Sidebar: Certificate List */}
      <div
        style={{
          width: '320px',
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
            Daftar Berkas ({generatedCertificates.length})
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Pilih berkas untuk proses penandatanganan
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
          {generatedCertificates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <Clock size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
              <p style={{ fontSize: '0.85rem' }}>Belum ada berkas hasil generate.</p>
              <p style={{ fontSize: '0.75rem' }}>Generate berkas di tab "Batch Generator" terlebih dahulu.</p>
            </div>
          ) : (
            generatedCertificates.map((cert) => {
              const isSelected = cert.id === selectedCert?.id;
              const signedCount = cert.signedBy.length;
              const totalRequired = template.signers.length;

              return (
                <div
                  key={cert.id}
                  onClick={() => setSelectedCertId(cert.id)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-subtle)',
                    border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {cert.id}
                    </span>
                    <span
                      className={`badge ${
                        signedCount >= totalRequired
                          ? 'badge-success'
                          : signedCount > 0
                          ? 'badge-warning'
                          : 'badge-muted'
                      }`}
                      style={{ fontSize: '0.65rem' }}
                    >
                      {signedCount >= totalRequired
                        ? 'Lengkap'
                        : `${signedCount}/${totalRequired} TTD`}
                    </span>
                  </div>
                  <h4
                    style={{
                      fontSize: '0.875rem',
                      color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {cert.data['nama'] || cert.fileName}
                  </h4>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Signing Workspace */}
      {selectedCert ? (
        <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top Status Bar */}
          <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span className="badge badge-primary">{selectedCert.id}</span>
                <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                  {selectedCert.data['nama'] || selectedCert.fileName}
                </h2>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Target File: {selectedCert.fileName} | SHA-256: {selectedCert.manifest.fileHash?.slice(0, 20)}...
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => handlePreview(selectedCert.currentPdfBytes)}>
                <Eye size={15} />
                <span>Pratinjau PDF</span>
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => handleDownloadPdf(selectedCert)}>
                <Download size={15} />
                <span>Download PDF</span>
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => handleDownloadManifest(selectedCert)}>
                <FileCheck size={15} />
                <span>Manifes (.sig.json)</span>
              </button>
            </div>
          </div>

          {/* Dual Signers Workflow Status Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {template.signers.map((signer) => {
              const isSigned = selectedCert.signedBy.includes(signer.id);
              const signatureRecord = selectedCert.manifest.signatures.find((s) => s.userId === signer.id);

              return (
                <div
                  key={signer.id}
                  className="glass-card"
                  style={{
                    padding: '1.25rem',
                    borderColor: isSigned ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)',
                    background: isSigned ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-surface)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <span className="badge badge-muted" style={{ marginBottom: '0.25rem' }}>{signer.id}</span>
                      <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{signer.name}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {signer.role} — {signer.organization}
                      </p>
                    </div>

                    {isSigned ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#34d399' }}>
                        <CheckCircle size={20} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Telah Ditandatangani</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#fbbf24' }}>
                        <Clock size={20} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Menunggu TTD</span>
                      </div>
                    )}
                  </div>

                  {isSigned && signatureRecord ? (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
                      <p>Waktu Sign: {new Date(signatureRecord.signedAt).toLocaleString('id-ID')}</p>
                      <p style={{ fontFamily: 'monospace' }}>Sig: {signatureRecord.signature.slice(0, 32)}...</p>
                    </div>
                  ) : (
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                        Stamp tanda tangan belum muncul pada PDF (lazy stamping).
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action: Trigger Signing Execution */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Bubuhkan Tanda Tangan Digital PAdES X.509
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Pilih Authorized Signer yang akan menandatangani dokumen ini. Tanda tangan dapat dilakukan dalam urutan mana pun
              secara independen. Stamp visual akan otomatis dimunculkan pada posisi yang tepat secara incremental.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ minWidth: '280px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                  Pilih Authorized Signer Aktif:
                </label>
                <select
                  className="form-select"
                  value={activeSignerId}
                  onChange={(e) => setActiveSignerId(e.target.value)}
                >
                  {template.signers.map((s) => {
                    const alreadySigned = selectedCert.signedBy.includes(s.id);
                    return (
                      <option key={s.id} value={s.id} disabled={alreadySigned}>
                        {s.name} ({s.role}) {alreadySigned ? '— [Sudah Sign]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div style={{ alignSelf: 'flex-end' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleSignDocument}
                  disabled={isSigning || selectedCert.signedBy.includes(activeSignerId)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {isSigning ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  <span>
                    {isSigning
                      ? 'Sedang Memproses PAdES...'
                      : selectedCert.signedBy.includes(activeSignerId)
                      ? 'Sudah Ditandatangani'
                      : 'Sign Dokumen Ini Sekarang'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Multi-Signer Cryptographic Integrity Card */}
          {verification && (
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <ShieldCheck size={20} color={verification.isValid ? '#34d399' : '#f59e0b'} />
                <h3 style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                  Verifikasi Kriptografis & Integritas Dokumen (Revision Hash Check)
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem' }}>
                {verification.details.map((item, idx) => (
                  <div key={idx} style={{ color: item.includes('✓') ? '#34d399' : item.includes('✗') ? '#f87171' : 'var(--text-secondary)' }}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Pilih berkas sertifikat dari daftar di sebelah kiri untuk memulai penandatanganan.
        </div>
      )}

      {/* Processing Modal for Signing */}
      <ProcessingModal
        isOpen={isSigning}
        title="Membubuhkan Tanda Tangan Digital PAdES..."
        subtitle={
          activeSigner
            ? `Menerapkan stempel visual dan enkripsi signature SHA-256 RSA-2048 oleh ${activeSigner.name}...`
            : 'Sedang menandatangani dokumen PDF...'
        }
        type="signing"
        hint="Proses ini menghitung digest SHA-256 incremental dan mengenkripsinya dengan Private Key PKCS#12."
      />

      {/* Preview Modal */}
      {previewPdfUrl && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.85)',
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
              <span style={{ fontWeight: 600 }}>Pratinjau PDF Hasil Tanda Tangan</span>
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
