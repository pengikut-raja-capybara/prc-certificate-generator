import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { StampStyleType } from '../../types/template';
import { ShieldCheck, Award } from 'lucide-react';

interface StampPreviewCardProps {
  style: StampStyleType;
  signerName?: string;
  signerRole?: string;
  organization?: string;
  serialNumber?: string;
  scale?: number;
  interactive?: boolean;
}

export const StampPreviewCard: React.FC<StampPreviewCardProps> = ({
  style,
  signerName = 'Nama Penandatangan',
  signerRole = 'Jabatan Penandatangan',
  organization = '',
  serialNumber = 'SN-DUMMY-XXXX',
  scale = 1,
  interactive = false,
}) => {
  const [qrSrc, setQrSrc] = useState<string>('');

  useEffect(() => {
    if (style === 'C') return;

    const payload = { nama: signerName, noSeri: serialNumber };

    QRCode.toDataURL(JSON.stringify(payload), {
      margin: 1,
      width: 140,
      errorCorrectionLevel: 'L',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrSrc(url))
      .catch((err) => console.error('Failed to generate dummy QR', err));
  }, [style, signerName, signerRole, organization, serialNumber]);

  return (
    <div
      style={{
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: 'top left',
        fontFamily: "'Inter', sans-serif",
        cursor: interactive ? 'pointer' : 'default',
      }}
    >
      {style === 'A' && (
        <div
          style={{
            width: '260px',
            minHeight: '72px',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1.5px solid #cbd5e1',
            borderRadius: '6px',
            padding: '6px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            position: 'relative',
            userSelect: 'none',
          }}
        >
          {/* Badge */}
          <div
            style={{
              position: 'absolute',
              top: '-7px',
              left: '8px',
              background: '#0284c7',
              color: '#ffffff',
              fontSize: '8px',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '3px',
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            <ShieldCheck size={10} /> DUMMY STYLE A
          </div>

          {/* Text block (aligned right towards QR) */}
          <div
            style={{
              flex: 1,
              textAlign: 'right',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              paddingTop: '4px',
            }}
          >
            <div style={{ fontSize: '7.5px', color: '#64748b', lineHeight: 1.15 }}>
              Ditandatangani secara elektronik oleh:
            </div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#0f172a',
                lineHeight: 1.25,
                marginTop: '2px',
              }}
            >
              {signerName}
            </div>
            <div style={{ fontSize: '8px', color: '#334155', lineHeight: 1.2 }}>
              {signerRole} {organization}
            </div>
            <div
              style={{
                fontSize: '7px',
                fontStyle: 'italic',
                color: '#64748b',
                lineHeight: 1.2,
                marginTop: '1px',
              }}
            >
              No. Seri: {serialNumber}
            </div>
          </div>

          {/* QR Code image */}
          <div
            style={{
              width: '56px',
              height: '56px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {qrSrc ? (
              <img src={qrSrc} alt="QR Code Dummy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: '8px', color: '#94a3b8' }}>QR...</span>
            )}
          </div>
        </div>
      )}

      {style === 'B' && (
        <div
          style={{
            width: '150px',
            minHeight: '115px',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1.5px solid #cbd5e1',
            borderRadius: '6px',
            padding: '8px 6px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            position: 'relative',
            userSelect: 'none',
          }}
        >
          {/* Badge */}
          <div
            style={{
              position: 'absolute',
              top: '-7px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#6366f1',
              color: '#ffffff',
              fontSize: '8px',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '3px',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            <ShieldCheck size={10} /> DUMMY STYLE B
          </div>

          {/* QR Code image */}
          <div
            style={{
              width: '56px',
              height: '56px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '4px',
            }}
          >
            {qrSrc ? (
              <img src={qrSrc} alt="QR Code Dummy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: '8px', color: '#94a3b8' }}>QR...</span>
            )}
          </div>

          {/* Text centered */}
          <div style={{ textAlign: 'center', width: '100%' }}>
            <div
              style={{
                fontSize: '9.5px',
                fontWeight: 700,
                color: '#0f172a',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {signerName}
            </div>
            <div
              style={{
                fontSize: '8px',
                color: '#475569',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: '1px',
              }}
            >
              {signerRole}
            </div>
          </div>
        </div>
      )}

      {style === 'C' && (
        <div
          style={{
            width: '240px',
            minHeight: '72px',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '1.5px solid #cbd5e1',
            borderLeft: '4px solid #4f46e5',
            borderRadius: '6px',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            position: 'relative',
            userSelect: 'none',
          }}
        >
          {/* Badge */}
          <div
            style={{
              position: 'absolute',
              top: '-7px',
              left: '8px',
              background: '#4f46e5',
              color: '#ffffff',
              fontSize: '8px',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            <Award size={10} /> DUMMY STYLE C
          </div>

          <div style={{ flex: 1, paddingTop: '3px' }}>
            <div style={{ fontSize: '7.5px', color: '#64748b', lineHeight: 1.15 }}>
              Ditandatangani secara elektronik oleh:
            </div>
            <div
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                color: '#0f172a',
                lineHeight: 1.25,
                marginTop: '2px',
              }}
            >
              {signerName}
            </div>
            <div style={{ fontSize: '8px', color: '#334155', lineHeight: 1.2 }}>
              {signerRole} {organization}
            </div>
            <div
              style={{
                fontSize: '7px',
                fontStyle: 'italic',
                color: '#64748b',
                lineHeight: 1.2,
                marginTop: '1px',
              }}
            >
              No. Seri: {serialNumber}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
