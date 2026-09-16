import React, { useEffect } from 'react';
import { FileText, X, ExternalLink, Download } from 'lucide-react';

interface PdfPreviewModalProps {
  pdfUrl: string | null;
  title?: string;
  fileName?: string;
  onClose: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  pdfUrl,
  title = 'Pratinjau Dokumen PDF',
  fileName = 'dokumen.pdf',
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pdfUrl) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pdfUrl, onClose]);

  if (!pdfUrl) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width: '94%',
          maxWidth: '1080px',
          height: '88vh',
          backgroundColor: 'var(--bg-surface, #1e293b)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle, #334155)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle, #334155)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-card, #0f172a)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileText size={20} color="var(--primary-color, #6366f1)" />
            <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary, #f8fafc)' }}>
              {title}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-xs"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none' }}
              title="Buka di Tab Baru"
            >
              <ExternalLink size={14} />
              <span>Tab Baru</span>
            </a>
            <a
              href={pdfUrl}
              download={fileName}
              className="btn btn-secondary btn-xs"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', textDecoration: 'none' }}
              title="Unduh PDF"
            >
              <Download size={14} />
              <span>Unduh</span>
            </a>
            <button
              className="btn btn-secondary btn-xs"
              onClick={onClose}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              title="Tutup (Esc)"
            >
              <X size={15} />
              <span>Tutup</span>
            </button>
          </div>
        </div>

        {/* PDF Frame */}
        <div style={{ flex: 1, backgroundColor: '#525659', position: 'relative' }}>
          <iframe
            src={pdfUrl}
            title={title}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
            }}
          />
        </div>
      </div>
    </div>
  );
};
