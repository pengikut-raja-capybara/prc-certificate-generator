import React, { useRef, useState } from 'react';
import { useKeysStore } from '../../stores/keys-store';
import { useGeneratorStore } from '../../stores/generator-store';
import { triggerDownload } from '../../lib/batch-generator';
import {
  Key,
  Shield,
  Download,
  Upload,
  UserPlus,
  Trash2,
  CheckCircle,
  FileBadge,
  Sparkles,
  Lock,
  RotateCcw,
  KeyRound,
  FileText,
} from 'lucide-react';
import { showSuccessAlert, showErrorAlert, showConfirmDialog } from '../../lib/alerts';
import { ProcessingModal } from '../shared/ProcessingModal';

export const KeyManagerView: React.FC = () => {
  const {
    ca,
    signers,
    certs,
    addSigner,
    deleteSigner,
    clearAllSigners,
    loadDemoSigners,
    resetRootCa,
    exportBundle,
    importBundle,
  } = useKeysStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetCaModal, setShowResetCaModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newOrg, setNewOrg] = useState(ca?.organization || 'Universitas Kuvukiland');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('secret_password_123');

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingConfig, setProcessingConfig] = useState<{
    title: string;
    subtitle?: string;
    hint?: string;
    type?: 'key' | 'generate' | 'signing' | 'general';
  }>({
    title: '',
    subtitle: '',
    hint: '',
    type: 'key',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportBundle = () => {
    try {
      const jsonStr = exportBundle();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      triggerDownload(blob, `pki-keys-bundle-${Date.now()}.json`);
    } catch (err: any) {
      showErrorAlert('Gagal Ekspor', err?.message || 'Gagal mengekspor bundle');
    }
  };

  const handleImportBundle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const ok = importBundle(event.target?.result as string);
        if (ok) {
          showSuccessAlert('Impor Berhasil', 'Berhasil mengimpor seluruh kunci dan sertifikat X.509!');
        } else {
          showErrorAlert('Gagal Impor', 'Gagal mengimpor berkas bundle kunci. Pastikan format valid.');
        }
      } catch (err: any) {
        showErrorAlert('Error', err?.message);
      }
    };
    reader.readAsText(file);
  };

  const handleCreateSigner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newRole.trim()) return;

    setIsProcessing(true);
    setProcessingConfig({
      title: 'Menerbitkan Kunci & Sertifikat',
      subtitle: `Sedang membuat pasangan kunci RSA-2048 dan sertifikat digital X.509 untuk "${newName.trim()}"...`,
      hint: 'Kunci privat dienkripsi ke format PKCS#12 (.p12) secara lokal tanpa server.',
      type: 'key',
    });

    setTimeout(() => {
      try {
        addSigner(
          newName.trim(),
          newRole.trim(),
          newOrg.trim() || ca?.organization || 'Organisasi',
          newEmail.trim() || undefined,
          newPassword.trim() || 'secret_password_123'
        );
        setNewName('');
        setNewRole('');
        setNewEmail('');
        setNewPassword('secret_password_123');
        setShowAddModal(false);
        showSuccessAlert(
          'Authorized Signer Ditambahkan',
          `Sertifikat X.509 dan kunci privat P12 untuk ${newName} berhasil dibuat.`
        );
      } catch (err: any) {
        showErrorAlert('Gagal Membuat Kunci', err?.message || 'Terjadi kesalahan kriptografi');
      } finally {
        setIsProcessing(false);
      }
    }, 50);
  };

  const handleDeleteSigner = async (signerId: string, signerName: string) => {
    const confirmed = await showConfirmDialog(
      `Hapus Authorized Signer ${signerName}?`,
      `Kunci privat RSA dan sertifikat PKCS#12 (.p12) milik "${signerName}" akan dihapus permanen dari sistem.`,
      'Ya, Hapus'
    );
    if (confirmed) {
      deleteSigner(signerId);
      showSuccessAlert('Terhapus', `Authorized Signer ${signerName} berhasil dihapus.`);
    }
  };

  const handleClearAllSigners = async () => {
    const confirmed = await showConfirmDialog(
      'Kosongkan Semua Authorized Signer?',
      'Seluruh daftar Authorized Signer dan sertifikat P12 akan dikosongkan (default kosong).',
      'Ya, Kosongkan Semua'
    );
    if (confirmed) {
      clearAllSigners();
      showSuccessAlert('Dikosongkan', 'Semua Authorized Signer dan sertifikat berhasil dikosongkan.');
    }
  };

  const handleLoadDemo = () => {
    setIsProcessing(true);
    setProcessingConfig({
      title: 'Memuat Authorized Signer Demo',
      subtitle: 'Sedang men-generate 2 pasang kunci kriptografi RSA-2048 & sertifikat P12 contoh...',
      hint: 'Proses kriptografi berjalan aman di browser via Web Cryptography.',
      type: 'key',
    });

    setTimeout(() => {
      try {
        loadDemoSigners();
        showSuccessAlert('Demo Dimuat', '2 Authorized Signer contoh (Rektor & Dekan) berhasil dimuat!');
      } catch (err: any) {
        showErrorAlert('Gagal Memuat Demo', err?.message);
      } finally {
        setIsProcessing(false);
      }
    }, 50);
  };

  const handleDownloadCaCert = () => {
    if (!ca) return;
    const blob = new Blob([ca.caCertPem], { type: 'application/x-x509-ca-cert' });
    const cleanOrg = ca.organization.toLowerCase().replace(/[^a-z0-9]/g, '_');
    triggerDownload(blob, `root-ca-${cleanOrg}.crt`);
  };

  const handleDownloadP12 = (signerId: string) => {
    const cert = certs[signerId];
    if (!cert) return;

    const binaryStr = atob(cert.p12Base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: 'application/x-pkcs12' });
    triggerDownload(blob, `${signerId}.p12`);
  };

  const handleResetRootCa = async (e: React.FormEvent) => {
    e.preventDefault();
    const confirmed = await showConfirmDialog(
      'Terbitkan Ulang Root CA?',
      `Menerbitkan Root CA baru atas nama "${newOrg}" akan mereset sertifikat lama karena Issuer berubah.`,
      'Ya, Terbitkan Root CA Baru'
    );
    if (confirmed) {
      setIsProcessing(true);
      setProcessingConfig({
        title: 'Menerbitkan Root CA Baru',
        subtitle: `Membuat pasangan kunci RSA-2048 dan Self-Signed Root Certificate untuk Organisasi "${newOrg.trim()}"...`,
        hint: 'Root CA baru ini bertindak sebagai otoritas penerbit resmi untuk semua signer.',
        type: 'key',
      });
      setShowResetCaModal(false);

      setTimeout(() => {
        try {
          resetRootCa(newOrg.trim() || 'Universitas Kuvukiland');
          useGeneratorStore.getState().invalidateGeneratedCertificates();
          showSuccessAlert('Root CA Baru', `Root CA untuk "${newOrg}" berhasil diterbitkan.`);
        } catch (err: any) {
          showErrorAlert('Gagal Menerbitkan Root CA', err?.message);
        } finally {
          setIsProcessing(false);
        }
      }, 50);
    }
  };

  return (
    <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', background: 'var(--bg-base)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', marginBottom: '0.25rem', fontWeight: 700 }}>
              Manajemen Kunci & Sertifikat Digital (PKI Hub)
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              Kelola Otoritas Sertifikasi (Root CA), pasangan kunci kriptografis Authorized Signer untuk Organisasi, serta ekspor/impor bundle.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)} style={{ fontSize: '0.78rem' }}>
              <UserPlus size={14} />
              <span>Tambah Authorized Signer</span>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleExportBundle} style={{ fontSize: '0.78rem' }}>
              <Download size={14} />
              <span>Export Bundle (.json)</span>
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => fileInputRef.current?.click()} style={{ fontSize: '0.78rem' }}>
              <Upload size={14} />
              <span>Import Bundle</span>
            </button>
            {signers.length > 0 && (
              <button
                className="btn btn-outline btn-sm"
                onClick={handleClearAllSigners}
                style={{ fontSize: '0.78rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                title="Hapus semua Authorized Signer agar daftar kembali kosong"
              >
                <Trash2 size={14} />
                <span>Kosongkan Semua</span>
              </button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportBundle}
              accept=".json"
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Root CA Status Card */}
        {ca && (
          <div className="card" style={{ padding: '1rem', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    background: 'rgba(99, 102, 241, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary-color)',
                  }}
                >
                  <Shield size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>Root CA Resmi</span>
                    <h3 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {ca.organization}
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Diterbitkan: {new Date(ca.createdAt).toLocaleString('id-ID')} • Algoritma: RSA-2048 + SHA-256 (PAdES Compliant)
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  className="btn btn-outline btn-xs"
                  onClick={handleDownloadCaCert}
                  title="Unduh Berkas Root CA (.crt) untuk diimpor ke Adobe Acrobat Reader / OS Trusted Root"
                  style={{ fontSize: '0.72rem' }}
                >
                  <FileText size={12} />
                  <span>Download CA (.crt)</span>
                </button>
                <button
                  className="btn btn-outline btn-xs"
                  onClick={() => {
                    setNewOrg(ca.organization);
                    setShowResetCaModal(true);
                  }}
                  title="Ubah nama institusi atau buat ulang Root CA"
                  style={{ fontSize: '0.72rem' }}
                >
                  <RotateCcw size={12} />
                  <span>Ganti / Reset CA</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Signers List Section */}
        <div className="card" style={{ padding: '1rem', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound size={16} color="var(--primary-color)" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Daftar Authorized Signer ({signers.length})
              </h3>
            </div>

            {signers.length === 0 && (
              <button
                className="btn btn-outline btn-xs"
                onClick={handleLoadDemo}
                style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                <Sparkles size={12} color="var(--primary-color)" />
                <span>Muat Contoh Demo (2 Signer)</span>
              </button>
            )}
          </div>

          {signers.length === 0 ? (
            /* Empty State when Default / Cleared */
            <div
              style={{
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                background: 'var(--bg-surface)',
                borderRadius: '8px',
                border: '1px dashed var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary-color)',
                }}
              >
                <Key size={24} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                  Belum Ada Authorized Signer Terdaftar (Kosong)
                </h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '450px', lineHeight: 1.4 }}>
                  Sistem berada dalam kondisi bersih. Anda dapat menambahkan Authorized Signer Organisasi Anda secara mandiri,
                  atau memuat contoh demo (Rektor & Dekan) untuk uji coba instan.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowAddModal(true)}
                  style={{ fontSize: '0.78rem' }}
                >
                  <UserPlus size={14} />
                  <span>+ Tambah Authorized Signer</span>
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={handleLoadDemo}
                  style={{ fontSize: '0.78rem' }}
                >
                  <Sparkles size={14} />
                  <span>Muat Contoh Demo (2 Signer)</span>
                </button>
              </div>
            </div>
          ) : (
            /* Signers Cards */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {signers.map((signer) => {
                const cert = certs[signer.id];

                return (
                  <div
                    key={signer.id}
                    style={{
                      padding: '0.75rem 1rem',
                      background: 'var(--bg-surface)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: 'rgba(99, 102, 241, 0.12)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--primary-color)',
                        }}
                      >
                        <Key size={18} />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                          <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem' }}>
                            {signer.id}
                          </span>
                          <h4 style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                            {signer.name}
                          </h4>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {signer.role} • {signer.organization}
                        </p>
                        {cert && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              Seri: {cert.serialNumber}
                            </span>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <Lock size={10} />
                              <span>Pass P12: {cert.p12Password || 'secret_password_123'}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      {cert ? (
                        <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>
                          <CheckCircle size={11} />
                          <span>PKCS#12 Siap</span>
                        </span>
                      ) : (
                        <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                          Belum Ada Cert
                        </span>
                      )}

                      {cert && (
                        <button
                          className="btn btn-secondary btn-xs"
                          onClick={() => handleDownloadP12(signer.id)}
                          title="Download Berkas Kunci & Sertifikat PKCS#12 (.p12)"
                          style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <FileBadge size={13} />
                          <span>.P12</span>
                        </button>
                      )}

                      {/* Delete button available for ANY signer */}
                      <button
                        className="btn btn-outline btn-xs"
                        onClick={() => handleDeleteSigner(signer.id, signer.name)}
                        style={{ color: '#ef4444', borderColor: 'transparent', padding: '0.25rem 0.4rem' }}
                        title={`Hapus ${signer.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Signer Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.75)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '460px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.25rem', fontWeight: 700 }}>
              Tambah Authorized Signer Baru
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.4 }}>
              Sistem akan otomatis menghasilkan pasangan kunci RSA-2048 dan menerbitkan sertifikat digital X.509 resmi dari Root CA Organisasi.
            </p>

            <form onSubmit={handleCreateSigner} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem', fontWeight: 600 }}>
                  Nama Lengkap beserta Gelar *
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="misal: Dr. H. Faisal Basri, S.T., M.Eng."
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem', fontWeight: 600 }}>
                  Peran / Jabatan *
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="misal: Rektor / Dekan Fakultas / Direktur"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem', fontWeight: 600 }}>
                  Nama Organisasi / Lembaga
                </label>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                  value={newOrg}
                  onChange={(e) => setNewOrg(e.target.value)}
                  placeholder="misal: Universitas Kuvukiland"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                    Email Organisasi (Opsional)
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="signer@organisasi.id"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem' }}>
                    Password P12
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="secret_password_123"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Terbitkan Kunci & Sertifikat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset CA Modal */}
      {showResetCaModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.75)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.25rem', fontWeight: 700 }}>
              Ubah Organisasi & Buat Ulang Root CA
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.4 }}>
              Root CA baru akan diterbitkan dengan kunci RSA-2048 baru. Daftar Authorized Signer lama akan di-reset karena penerbit (Issuer) berubah.
            </p>

            <form onSubmit={handleResetRootCa} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.2rem', fontWeight: 600 }}>
                  Nama Institusi / Lembaga Baru *
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                  value={newOrg}
                  onChange={(e) => setNewOrg(e.target.value)}
                  placeholder="misal: Politeknik Negeri Jakarta"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowResetCaModal(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Terbitkan Root CA Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Animated Processing Modal for Key/CA generation */}
      <ProcessingModal isOpen={isProcessing} {...processingConfig} />
    </div>
  );
};
