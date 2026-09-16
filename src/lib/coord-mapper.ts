/**
 * Coordinate mapping between Fabric.js canvas (top-left origin, Y downwards)
 * and PDF (bottom-left origin, Y upwards).
 */

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Converts Fabric.js coordinates (origin top-left) to PDF coordinates (origin bottom-left)
 * @param fabricRect rectangle in fabric coordinates
 * @param pageHeight total height of PDF page in points
 */
export function fabricToPdfRect(fabricRect: Rect, pageHeight: number): Rect {
  const pdfY = pageHeight - fabricRect.y - fabricRect.height;
  return {
    x: fabricRect.x,
    y: pdfY,
    width: fabricRect.width,
    height: fabricRect.height,
  };
}

/**
 * Converts PDF coordinates (origin bottom-left) to Fabric.js coordinates (origin top-left)
 * @param pdfRect rectangle in PDF coordinates
 * @param pageHeight total height of PDF page in points
 */
export function pdfToFabricRect(pdfRect: Rect, pageHeight: number): Rect {
  const fabricY = pageHeight - pdfRect.y - pdfRect.height;
  return {
    x: pdfRect.x,
    y: fabricY,
    width: pdfRect.width,
    height: pdfRect.height,
  };
}
