import React from 'react';
import type { StampStyleType } from '../../types/template';
import { STAMP_STYLES } from '../../data/stamp-styles';
import { Check, Eye } from 'lucide-react';
import { StampPreviewCard } from './StampPreviewCard';

interface StampStylePickerProps {
  value: StampStyleType;
  onChange: (style: StampStyleType, defaultW: number, defaultH: number) => void;
  signerName?: string;
  signerRole?: string;
  organization?: string;
}

export const StampStylePicker: React.FC<StampStylePickerProps> = ({
  value,
  onChange,
  signerName,
  signerRole,
  organization,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      {STAMP_STYLES.map((style) => {
        const isSelected = value === style.id;
        return (
          <div
            key={style.id}
            onClick={() => onChange(style.id, style.defaultWidth, style.defaultHeight)}
            style={{
              padding: '0.85rem',
              borderRadius: '10px',
              cursor: 'pointer',
              border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
              background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-surface)',
              transition: 'all 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
            }}
          >
            {/* Header: Title & Check */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  color: isSelected ? '#a5b4fc' : 'var(--text-primary)',
                }}
              >
                {style.title}
              </span>
              {isSelected && <Check size={16} color="var(--primary)" />}
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
              {style.description}
            </p>

            {/* Live Dummy Preview Container */}
            <div
              style={{
                background: '#090d16',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)',
                  marginBottom: '0.4rem',
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Eye size={12} /> Contoh Bentuk Tampilan (Dummy Preview):
              </div>

              <StampPreviewCard
                style={style.id}
                signerName={signerName || 'Nama Penandatangan'}
                signerRole={signerRole || 'Jabatan Penandatangan'}
                organization={organization || ''}
                serialNumber="SN-DUMMY-XXXX"
                scale={style.id === 'B' ? 0.95 : 0.9}
              />
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>
                Ukuran Standar: {style.defaultWidth} × {style.defaultHeight} pt
              </span>
              <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                {style.badge}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
