import React from 'react';
import { Loader2, KeyRound, FileCheck2, FileSignature } from 'lucide-react';

export interface ProcessingModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  hint?: string;
  progress?: {
    current: number;
    total: number;
  } | null;
  type?: 'key' | 'generate' | 'signing' | 'general';
}

export const ProcessingModal: React.FC<ProcessingModalProps> = ({
  isOpen,
  title,
  subtitle,
  hint,
  progress,
  type = 'general',
}) => {
  if (!isOpen) return null;

  const percent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : null;

  const renderIcon = () => {
    switch (type) {
      case 'key':
        return <KeyRound size={28} color="#6366f1" />;
      case 'generate':
        return <FileCheck2 size={28} color="#0284c7" />;
      case 'signing':
        return <FileSignature size={28} color="#10b981" />;
      default:
        return <Loader2 size={28} color="#6366f1" className="animate-spin" />;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 16, 0.82)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-focus)',
          borderRadius: '16px',
          padding: '2rem 1.75rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), var(--shadow-glow)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '1rem',
          animation: 'pulse-slow 3s ease-in-out infinite',
        }}
      >
        {/* Animated Visual Ring */}
        <div style={{ position: 'relative', width: '68px', height: '68px' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background:
                type === 'signing'
                  ? 'rgba(16, 185, 129, 0.15)'
                  : type === 'generate'
                  ? 'rgba(2, 132, 199, 0.15)'
                  : 'rgba(99, 102, 241, 0.15)',
              border: `2px dashed ${
                type === 'signing' ? '#10b981' : type === 'generate' ? '#0284c7' : '#6366f1'
              }`,
            }}
            className="animate-spin"
          />
          <div
            style={{
              position: 'absolute',
              inset: '6px',
              borderRadius: '50%',
              background: 'var(--bg-base)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {renderIcon()}
          </div>
        </div>

        {/* Text Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <h3
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-heading)',
            }}
          >
            {title}
          </h3>
          {subtitle && (
            <p
              style={{
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.45,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Progress Bar & Counter (If applicable) */}
        {progress && (
          <div style={{ width: '100%', marginTop: '0.5rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                marginBottom: '0.35rem',
                fontWeight: 600,
              }}
            >
              <span>
                Memproses {progress.current} dari {progress.total}
              </span>
              <span>{percent}%</span>
            </div>
            <div
              style={{
                width: '100%',
                background: 'var(--bg-base)',
                borderRadius: '999px',
                height: '8px',
                overflow: 'hidden',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  height: '100%',
                  background:
                    type === 'signing'
                      ? 'linear-gradient(90deg, #10b981, #059669)'
                      : 'linear-gradient(90deg, #6366f1, #0284c7)',
                  width: `${percent}%`,
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Bottom Hint */}
        {hint && (
          <div
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              width: '100%',
            }}
          >
            {hint}
          </div>
        )}
      </div>
    </div>
  );
};
