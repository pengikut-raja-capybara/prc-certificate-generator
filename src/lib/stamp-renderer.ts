import { Standard14Font, StandardFonts, rgb, type PDF, type PDFPage } from '@libpdf/core';
import QRCode from 'qrcode';
import type { StampStyleType } from '../types/template';

export interface StampRenderOptions {
  signerName: string;
  signerRole: string;
  organization: string;
  serialNumber: string;
  documentId?: string;
  style: StampStyleType;
  x: number; // PDF X (bottom-left origin)
  y: number; // PDF Y (bottom-left origin)
  width: number;
  height: number;
}

/**
 * Renders the chosen signature stamp style (A, B, or C) onto a PDF page using @libpdf/core.
 */
export async function renderStampToPdf(
  doc: PDF,
  page: PDFPage,
  options: StampRenderOptions
): Promise<void> {
  const {
    signerName,
    signerRole,
    organization,
    serialNumber,
    documentId: _documentId = '',
    style,
    x,
    y,
    width,
    height,
  } = options;

  const fontRegular = Standard14Font.of(StandardFonts.Helvetica);
  const fontBold = Standard14Font.of(StandardFonts.HelveticaBold);
  const fontOblique = Standard14Font.of(StandardFonts.HelveticaOblique);

  if (style === 'A') {
    // Style A: QR Code on the right, 4 lines text aligned to right of the text block
    const qrSize = Math.min(height, 58);
    const qrX = x + width - qrSize;
    const qrY = y + (height - qrSize) / 2;
    const rightBoundary = qrX - 8;

    // QR Payload: ONLY { nama, noSeri }
    const qrPayload = {
      nama: signerName,
      noSeri: serialNumber,
    };
    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload), {
      margin: 1,
      width: 200,
      color: { dark: '#0f172a', light: '#ffffff' },
    });
    const qrBase64 = qrDataUrl.split(',')[1];
    const qrBytes = Uint8Array.from(atob(qrBase64), (c) => c.charCodeAt(0));
    const embeddedQr = await doc.embedPng(qrBytes);

    page.drawImage(embeddedQr, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    // Line 1: Label
    const labelText = 'Ditandatangani secara elektronik oleh:';
    const labelSize = 6.8;
    const labelWidth = fontRegular.widthOfTextAtSize(labelText, labelSize);
    page.drawText(labelText, {
      x: Math.max(x, rightBoundary - labelWidth),
      y: qrY + 44,
      size: labelSize,
      font: StandardFonts.Helvetica,
      color: rgb(0.35, 0.42, 0.5),
    });

    // Line 2: Name Bold
    const nameSize = 8.5;
    const nameWidth = fontBold.widthOfTextAtSize(signerName, nameSize);
    page.drawText(signerName, {
      x: Math.max(x, rightBoundary - nameWidth),
      y: qrY + 30,
      size: nameSize,
      font: StandardFonts.HelveticaBold,
      color: rgb(0.1, 0.15, 0.25),
    });

    // Line 3: Role & Institution
    const roleText = `${signerRole} ${organization}`;
    const roleSize = 7.2;
    const roleWidth = fontRegular.widthOfTextAtSize(roleText, roleSize);
    page.drawText(roleText, {
      x: Math.max(x, rightBoundary - roleWidth),
      y: qrY + 18,
      size: roleSize,
      font: StandardFonts.Helvetica,
      color: rgb(0.25, 0.35, 0.45),
    });

    // Line 4: Serial Number
    const serialText = `No. Seri: ${serialNumber}`;
    const serialSize = 6.2;
    const serialWidth = fontOblique.widthOfTextAtSize(serialText, serialSize);
    page.drawText(serialText, {
      x: Math.max(x, rightBoundary - serialWidth),
      y: qrY + 6,
      size: serialSize,
      font: StandardFonts.HelveticaOblique,
      color: rgb(0.45, 0.52, 0.6),
    });
  } else if (style === 'B') {
    // Style B: QR Centered above, 2 lines text underneath
    const qrSize = Math.min(width * 0.5, height * 0.62, 64);
    const qrX = x + (width - qrSize) / 2;
    const qrY = y + height - qrSize;

    const qrPayload = {
      nama: signerName,
      noSeri: serialNumber,
    };
    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload), {
      margin: 1,
      width: 200,
      errorCorrectionLevel: 'L',
      color: { dark: '#0f172a', light: '#ffffff' },
    });
    const qrBase64 = qrDataUrl.split(',')[1];
    const qrBytes = Uint8Array.from(atob(qrBase64), (c) => c.charCodeAt(0));
    const embeddedQr = await doc.embedPng(qrBytes);

    page.drawImage(embeddedQr, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    // Line 1: Name Bold (centered)
    const nameSize = 8;
    const nameWidth = fontBold.widthOfTextAtSize(signerName, nameSize);
    page.drawText(signerName, {
      x: x + Math.max(0, (width - nameWidth) / 2),
      y: y + 16,
      size: nameSize,
      font: StandardFonts.HelveticaBold,
      color: rgb(0.1, 0.15, 0.25),
    });

    // Line 2: Role (centered)
    const roleText = signerRole;
    const roleSize = 7;
    const roleWidth = fontRegular.widthOfTextAtSize(roleText, roleSize);
    page.drawText(roleText, {
      x: x + Math.max(0, (width - roleWidth) / 2),
      y: y + 6,
      size: roleSize,
      font: StandardFonts.Helvetica,
      color: rgb(0.35, 0.42, 0.5),
    });
  } else if (style === 'C') {
    // Style C: Minimalist Text-Only (No QR)
    const labelText = 'Ditandatangani oleh:';
    const labelSize = 7;
    page.drawText(labelText, {
      x: x + 4,
      y: y + height - 12,
      size: labelSize,
      font: StandardFonts.Helvetica,
      color: rgb(0.4, 0.45, 0.55),
    });

    // Name bold
    const nameSize = 9;
    page.drawText(signerName, {
      x: x + 4,
      y: y + height - 26,
      size: nameSize,
      font: StandardFonts.HelveticaBold,
      color: rgb(0.1, 0.15, 0.25),
    });

    // Role & Organization
    const roleText = `${signerRole} ${organization}`;
    const roleSize = 7.5;
    page.drawText(roleText, {
      x: x + 4,
      y: y + height - 39,
      size: roleSize,
      font: StandardFonts.Helvetica,
      color: rgb(0.25, 0.35, 0.45),
    });

    // Serial
    const serialText = `No. Seri: ${serialNumber}`;
    const serialSize = 6.2;
    page.drawText(serialText, {
      x: x + 4,
      y: y + 4,
      size: serialSize,
      font: StandardFonts.HelveticaOblique,
      color: rgb(0.45, 0.52, 0.6),
    });
  }
}

/**
 * Generates an SVG or PNG data URL preview of the stamp for the canvas editor
 */
export async function generateStampPreviewDataUrl(
  options: Omit<StampRenderOptions, 'x' | 'y'>
): Promise<string> {
  const {
    signerName,
    signerRole,
    organization,
    serialNumber,
    documentId: _documentId = '',
    style,
    width,
    height,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(200, width * 2);
  canvas.height = Math.max(80, height * 2);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.scale(2, 2);
  const w = width;
  const h = height;

  // Background card styling with subtle rounded rectangle
  ctx.fillStyle = 'rgba(248, 250, 252, 0.95)';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 6);
  ctx.fill();
  ctx.stroke();

  if (style === 'A') {
    const qrSize = Math.min(h - 10, 52);
    const qrX = w - qrSize - 6;
    const qrY = (h - qrSize) / 2;

    const qrUrl = await QRCode.toDataURL(JSON.stringify({ nama: signerName, noSeri: serialNumber }), {
      margin: 0,
      width: qrSize * 2,
    });
    const qrImg = new Image();
    await new Promise((res) => {
      qrImg.onload = res;
      qrImg.src = qrUrl;
    });
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    ctx.textAlign = 'right';
    const textRight = qrX - 8;

    ctx.fillStyle = '#64748b';
    ctx.font = '6.5px sans-serif';
    ctx.fillText('Ditandatangani secara elektronik oleh:', textRight, 18);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 8.5px sans-serif';
    ctx.fillText(signerName, textRight, 31);

    ctx.fillStyle = '#334155';
    ctx.font = '7.5px sans-serif';
    ctx.fillText(`${signerRole} ${organization}`, textRight, 43);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 6.5px sans-serif';
    ctx.fillText(`No. Seri: ${serialNumber}`, textRight, 54);
  } else if (style === 'B') {
    const qrSize = Math.min(w * 0.4, h * 0.6, 50);
    const qrX = (w - qrSize) / 2;
    const qrY = 6;

    const qrUrl = await QRCode.toDataURL(
      JSON.stringify({ nama: signerName, noSeri: serialNumber }),
      { margin: 0, width: qrSize * 2, errorCorrectionLevel: 'L' }
    );
    const qrImg = new Image();
    await new Promise((res) => {
      qrImg.onload = res;
      qrImg.src = qrUrl;
    });
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 8.5px sans-serif';
    ctx.fillText(signerName, w / 2, qrY + qrSize + 12);

    ctx.fillStyle = '#475569';
    ctx.font = '7px sans-serif';
    ctx.fillText(signerRole, w / 2, qrY + qrSize + 22);
  } else if (style === 'C') {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '7px sans-serif';
    ctx.fillText('Ditandatangani oleh:', 10, 16);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 9.5px sans-serif';
    ctx.fillText(signerName, 10, 31);

    ctx.fillStyle = '#334155';
    ctx.font = '8px sans-serif';
    ctx.fillText(`${signerRole} ${organization}`, 10, 44);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 6.5px sans-serif';
    ctx.fillText(`No. Seri: ${serialNumber}`, 10, 56);
  }

  return canvas.toDataURL('image/png');
}
