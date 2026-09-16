import { PDFDocument } from 'pdf-lib';
import type { TemplateConfig } from '../types/template';
import QRCode from 'qrcode';

/**
 * Replaces placeholders like {{nama}} with corresponding values from the data row.
 */
export function interpolateVariables(
  templateStr: string,
  data: Record<string, string | number>
): string {
  if (!templateStr) return '';
  return templateStr.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    if (key in data) {
      return String(data[key]);
    }
    return match;
  });
}

/**
 * Extracts all unique {{variable}} names found across the template elements.
 */
export function extractTemplateVariables(template: TemplateConfig): string[] {
  const vars = new Set<string>();
  const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

  for (const el of template.elements) {
    if (el.variable) {
      let match;
      while ((match = regex.exec(el.variable)) !== null) {
        vars.add(match[1]);
      }
    }
    if (el.text) {
      let match;
      while ((match = regex.exec(el.text)) !== null) {
        vars.add(match[1]);
      }
    }
    if (el.qrContentTemplate) {
      let match;
      while ((match = regex.exec(el.qrContentTemplate)) !== null) {
        vars.add(match[1]);
      }
    }
  }

  return Array.from(vars);
}

function drawDummyStampOnCanvas(ctx: CanvasRenderingContext2D, el: any) {
  const w = el.width;
  const h = el.height;
  const style = el.stampStyle || 'A';
  const signerName = 'Nama Penandatangan';
  const signerRole = 'Jabatan Penandatangan';
  const serial = 'SN-DUMMY-XXXX';

  const x = el.x;
  const y = el.y;

  ctx.save();

  // Draw QR Helper (borderless, clean white backdrop behind QR only)
  const drawQR = (qx: number, qy: number, qrSize: number) => {
    try {
      const qr = QRCode.create(JSON.stringify({ nama: signerName, noSeri: serial }), {
        errorCorrectionLevel: 'L',
      });
      const size = qr.modules.size;
      const cellSize = qrSize / size;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qx, qy, qrSize, qrSize);

      ctx.fillStyle = '#0f172a';
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (qr.modules.get(r, c)) {
            ctx.fillRect(
              Math.floor(qx + c * cellSize),
              Math.floor(qy + r * cellSize),
              Math.ceil(cellSize),
              Math.ceil(cellSize)
            );
          }
        }
      }
    } catch (e) {
      console.error('Error drawing preview QR:', e);
    }
  };

  if (style === 'A') {
    // Style A: Formal Academic (Seamless text + QR, no card border)
    const qrSize = Math.min(h - 8, 54);
    const qrX = x + w - qrSize;
    const qrY = y + (h - qrSize) / 2;
    drawQR(qrX, qrY, qrSize);

    const rightText = qrX - 8;
    ctx.textAlign = 'right';

    ctx.fillStyle = '#64748b';
    ctx.font = '7px Inter, sans-serif';
    ctx.fillText('Ditandatangani secara elektronik oleh:', rightText, y + 10);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.fillText(signerName, rightText, y + 24);

    ctx.fillStyle = '#334155';
    ctx.font = '8px Inter, sans-serif';
    ctx.fillText(signerRole, rightText, y + 38);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 7px Inter, sans-serif';
    ctx.fillText(`No. Seri: ${serial}`, rightText, y + 50);
  } else if (style === 'B') {
    // Style B: QR Centered on top (clean minimalist)
    const qrSize = Math.min(w * 0.5, h * 0.55, 52);
    const qrX = x + (w - qrSize) / 2;
    const qrY = y + 4;
    drawQR(qrX, qrY, qrSize);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 9.5px Inter, sans-serif';
    ctx.fillText(signerName, x + w / 2, qrY + qrSize + 12);

    ctx.fillStyle = '#475569';
    ctx.font = '8px Inter, sans-serif';
    ctx.fillText(signerRole, x + w / 2, qrY + qrSize + 24);
  } else {
    // Style C: Minimalist Typography
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '7px Inter, sans-serif';
    ctx.fillText('Ditandatangani secara elektronik oleh:', x + 4, y + 10);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 10.5px Inter, sans-serif';
    ctx.fillText(signerName, x + 4, y + 24);

    ctx.fillStyle = '#334155';
    ctx.font = '8.5px Inter, sans-serif';
    ctx.fillText(signerRole, x + 4, y + 38);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 7px Inter, sans-serif';
    ctx.fillText(`No. Seri: ${serial}`, x + 4, y + 50);
  }

  ctx.restore();
}

/**
 * Renders the certificate elements to an HTML5 offscreen canvas,
 * converts to high-resolution PNG, and embeds it as a full-bleed page in pdf-lib.
 * NOTE: Signature stamps are skipped (left blank) for lazy signing by default,
 * but rendered as dummy stamps when includeDummyStamps is true for design preview!
 */
export async function renderTemplateToBasePdf(
  template: TemplateConfig,
  data: Record<string, string | number>,
  options: {
    scale?: number;
    customBgImage?: HTMLImageElement;
    includeDummyStamps?: boolean;
  } = {}
): Promise<Uint8Array> {
  const scale = options.scale ?? 2; // 2x for crisp 150-300 DPI print quality
  const width = template.dimensions.width;
  const height = template.dimensions.height;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  ctx.scale(scale, scale);

  // 1. Draw Background
  if (template.background.type === 'color' && template.background.color) {
    ctx.fillStyle = template.background.color;
    ctx.fillRect(0, 0, width, height);
  } else if (template.background.type === 'image' && template.background.src) {
    try {
      const bgImg = options.customBgImage || (await loadImage(template.background.src));
      const fit = template.background.fit || 'cover';
      const imgW = bgImg.naturalWidth || bgImg.width || 1;
      const imgH = bgImg.naturalHeight || bgImg.height || 1;

      if (fit === 'cover') {
        const bgScale = Math.max(width / imgW, height / imgH);
        const scaledW = imgW * bgScale;
        const scaledH = imgH * bgScale;
        const dx = (width - scaledW) / 2;
        const dy = (height - scaledH) / 2;
        ctx.drawImage(bgImg, dx, dy, scaledW, scaledH);
      } else if (fit === 'contain') {
        const bgScale = Math.min(width / imgW, height / imgH);
        const scaledW = imgW * bgScale;
        const scaledH = imgH * bgScale;
        const dx = (width - scaledW) / 2;
        const dy = (height - scaledH) / 2;
        ctx.drawImage(bgImg, dx, dy, scaledW, scaledH);
      } else {
        ctx.drawImage(bgImg, 0, 0, width, height);
      }
    } catch (e) {
      console.warn('Could not render background image, using fallback:', e);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);
    }
  }

  // 2. Sort elements by zIndex
  const sortedElements = [...template.elements].sort((a, b) => a.zIndex - b.zIndex);

  // 3. Render each element
  for (const el of sortedElements) {
    if (el.type === 'stamp-ttd') {
      if (options.includeDummyStamps) {
        drawDummyStampOnCanvas(ctx, el);
      }
      // Otherwise intentionally left empty on base certificate for lazy signing!
      continue;
    }

    ctx.save();
    ctx.globalAlpha = el.opacity ?? 1;

    if (el.type === 'static-text' || el.type === 'dynamic-text') {
      const rawText = el.type === 'dynamic-text' ? el.variable || el.text || '' : el.text || '';
      const textToRender = interpolateVariables(rawText, data);

      const fontName = el.fontFamily || 'sans-serif';
      const fontSize = el.fontSize || 16;
      const fontWeight = el.fontWeight || 'normal';
      const fontStyle = el.fontStyle || 'normal';

      ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${fontName}", sans-serif`;
      ctx.fillStyle = el.fill || '#0f172a';
      ctx.textAlign = (el.textAlign === 'justify' ? 'left' : el.textAlign) || 'left';
      ctx.textBaseline = 'top';

      let renderX = el.x;
      if (el.textAlign === 'center') {
        renderX = el.x + el.width / 2;
      } else if (el.textAlign === 'right') {
        renderX = el.x + el.width;
      }

      ctx.fillText(textToRender, renderX, el.y);
    } else if (el.type === 'image' && el.src) {
      try {
        const img = await loadImage(el.src);
        ctx.drawImage(img, el.x, el.y, el.width, el.height);
      } catch (err) {
        console.warn('Failed to load element image:', el.src);
      }
    } else if (el.type === 'qr') {
      const rawPayload = el.qrContentTemplate || 'https://verify.kuvukiland.ac.id';
      const qrContent = interpolateVariables(rawPayload, data);
      try {
        const qrDataUrl = await QRCode.toDataURL(qrContent, {
          margin: 1,
          width: el.width * scale,
          color: {
            dark: el.qrColor || '#000000',
            light: el.qrBackground || '#ffffff',
          },
        });
        const qrImg = await loadImage(qrDataUrl);
        ctx.drawImage(qrImg, el.x, el.y, el.width, el.height);
      } catch (err) {
        console.warn('QR render error:', err);
      }
    } else if (el.type === 'shape') {
      ctx.fillStyle = el.fill || '#e2e8f0';
      ctx.fillRect(el.x, el.y, el.width, el.height);
    }

    ctx.restore();
  }

  // 4. Convert canvas to PNG data URL and embed in pdf-lib
  const pngDataUrl = canvas.toDataURL('image/png');
  const base64Data = pngDataUrl.split(',')[1];
  const pngBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([width, height]);
  const embeddedPng = await pdfDoc.embedPng(pngBytes);

  page.drawImage(embeddedPng, {
    x: 0,
    y: 0,
    width,
    height,
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}
