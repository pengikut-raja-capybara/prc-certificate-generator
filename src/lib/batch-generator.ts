import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { Readable } from 'stream';
import type { TemplateConfig } from '../types/template';
import type { BatchRow, GeneratedCertificate, SignatureManifest } from '../types/generator';
import type { UserKey } from '../types/keys';
import { extractTemplateVariables, renderTemplateToBasePdf } from './pdf-renderer';
import { sha256, buildUserListHash } from './crypto';
import { getSignerP12Password, getStoredCerts } from './key-manager';

/**
 * Generates and downloads a CSV template file matching all variables used in the certificate.
 */
export async function downloadCsvTemplate(template: TemplateConfig, filename = 'template-data.csv') {
  const variables = extractTemplateVariables(template);
  const headers = variables.length > 0 ? variables : ['nama', 'nim', 'prodi', 'nomor_sertifikat', 'tanggal'];

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');
  worksheet.columns = headers.map((h) => ({ header: h, key: h }));

  const sampleRow: Record<string, string> = {};
  headers.forEach((h) => {
    if (h.includes('nama')) sampleRow[h] = 'Ahmad Dahlan, S.Kom.';
    else if (h.includes('nim')) sampleRow[h] = '2026101001';
    else if (h.includes('tanggal')) sampleRow[h] = '11 September 2026';
    else if (h.includes('nomor') || h.includes('no')) sampleRow[h] = 'CERT-2026-001';
    else sampleRow[h] = 'Contoh Nilai';
  });
  worksheet.addRow(sampleRow);

  const buffer = await workbook.csv.writeBuffer();
  const blob = new Blob([buffer], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

/**
 * Generates and downloads a beautifully styled Excel (.xlsx) template file matching all variables.
 */
export async function downloadExcelTemplate(template: TemplateConfig, filename = 'template-data.xlsx') {
  const variables = extractTemplateVariables(template);
  const headers = variables.length > 0 ? variables : ['nama', 'nim', 'prodi', 'nomor_sertifikat', 'tanggal'];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PRC Certificate Generator';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('TemplateData');

  const sampleRow: Record<string, string> = {};
  headers.forEach((h) => {
    if (h.includes('nama')) sampleRow[h] = 'Ahmad Dahlan, S.Kom.';
    else if (h.includes('nim')) sampleRow[h] = '2026101001';
    else if (h.includes('tanggal')) sampleRow[h] = '11 September 2026';
    else if (h.includes('nomor') || h.includes('no')) sampleRow[h] = 'CERT-2026-001';
    else sampleRow[h] = 'Contoh Nilai';
  });

  // Calculate auto column width
  worksheet.columns = headers.map((h) => {
    const sampleVal = sampleRow[h] || '';
    const colWidth = Math.max(h.length, sampleVal.length, 14) + 4;
    return { header: h, key: h, width: colWidth };
  });

  // Style Header Row (Row 1)
  const headerRow = worksheet.getRow(1);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0284C7' }, // Primary Blue
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0369A1' } },
      left: { style: 'thin', color: { argb: 'FF0369A1' } },
      bottom: { style: 'medium', color: { argb: 'FF075985' } },
      right: { style: 'thin', color: { argb: 'FF0369A1' } },
    };
  });

  // Add and style sample row (Row 2)
  const row2 = worksheet.addRow(sampleRow);
  row2.height = 22;
  row2.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, color: { argb: 'FF334155' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, filename);
}

/**
 * Exports current batch rows back to an Excel (.xlsx) file
 */
export async function exportBatchRowsToExcel(
  rows: BatchRow[],
  activeVariables: string[],
  filename = 'data-peserta-sertifikat.xlsx'
) {
  if (rows.length === 0) return;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PRC Certificate Generator';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('DataPeserta');
  const headers = activeVariables.length > 0 ? activeVariables : Object.keys(rows[0] || {});

  worksheet.columns = headers.map((h) => {
    let maxLen = h.length;
    rows.slice(0, 50).forEach((r) => {
      const val = String(r[h] ?? '');
      if (val.length > maxLen) maxLen = val.length;
    });
    return { header: h, key: h, width: Math.max(maxLen, 12) + 4 };
  });

  const headerRow = worksheet.getRow(1);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' }, // Emerald Green
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  rows.forEach((r) => {
    const row = worksheet.addRow(r);
    row.height = 20;
    row.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, filename);
}

/**
 * Parses uploaded CSV or Excel file into BatchRow array using ExcelJS
 */
export async function parseBatchDataFile(file: File): Promise<BatchRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  const isCsv = file.name.toLowerCase().endsWith('.csv');

  if (isCsv) {
    const stream = new Readable();
    stream.push(Buffer.from(arrayBuffer));
    stream.push(null);
    await workbook.csv.read(stream);
  } else {
    await workbook.xlsx.load(arrayBuffer);
  }

  // Find first worksheet with rows
  const worksheet = workbook.worksheets.find((ws) => ws.rowCount > 0) || workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount < 1) {
    throw new Error('Berkas spreadsheet kosong atau tidak memiliki data.');
  }

  // Extract headers from Row 1
  const headerRow = worksheet.getRow(1);
  const headers: { colIndex: number; key: string }[] = [];

  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const rawVal = cell.text || (cell.value !== null && cell.value !== undefined ? String(cell.value) : '');
    const cleanKey = rawVal.trim();
    if (cleanKey) {
      headers.push({ colIndex: colNumber, key: cleanKey });
    }
  });

  if (headers.length === 0) {
    throw new Error('Baris tajuk (header) kolom tidak ditemukan pada berkas.');
  }

  const rows: BatchRow[] = [];

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    let hasData = false;
    const rowObj: BatchRow = {};

    headers.forEach(({ colIndex, key }) => {
      const cell = row.getCell(colIndex);
      let val = '';

      if (cell.value !== null && cell.value !== undefined) {
        if (cell.value instanceof Date) {
          // Format date cleanly: e.g. "11 September 2026"
          val = cell.value.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
        } else if (typeof cell.value === 'object' && 'result' in cell.value) {
          val = String((cell.value as any).result ?? '').trim();
        } else if (typeof cell.value === 'object' && 'richText' in cell.value) {
          val = (cell.value as any).richText.map((t: any) => t.text).join('').trim();
        } else {
          val = String(cell.text || cell.value || '').trim();
        }
      }

      rowObj[key] = val;
      if (val !== '') hasData = true;
    });

    if (hasData) {
      rows.push(rowObj);
    }
  }

  if (rows.length === 0) {
    throw new Error('Tidak ada baris data peserta yang valid di bawah baris header.');
  }

  return rows;
}

/**
 * Runs batch generation of base certificates
 */
export async function generateBatchCertificates(
  template: TemplateConfig,
  rows: BatchRow[],
  allUsers: UserKey[],
  onProgress?: (current: number, total: number) => void
): Promise<GeneratedCertificate[]> {
  const results: GeneratedCertificate[] = [];
  const total = rows.length;

  for (let i = 0; i < total; i++) {
    const row = rows[i];
    const rowNum = i + 1;
    const certId = `CERT-${String(rowNum).padStart(4, '0')}`;
    const rawName = String(row['nama'] || row['name'] || `penerima-${rowNum}`);
    const cleanName = rawName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `sertifikat_${cleanName}.pdf`;

    try {
      const basePdfBytes = await renderTemplateToBasePdf(template, row);
      const fileHash = sha256(basePdfBytes);
      const userListHash = buildUserListHash(allUsers);
      const storedCerts = getStoredCerts();

      const stampElements = template.elements.filter((el) => el.type === 'stamp-ttd' && el.signerId);
      const uniqueSignerIds = Array.from(new Set(stampElements.map((el) => el.signerId!)));
      const signerCredentials = uniqueSignerIds.map((sId) => {
        const u = allUsers.find((user) => user.id === sId);
        const cert = storedCerts[sId];
        return {
          signerId: sId,
          signerName: u?.name || sId,
          role: u?.role || '',
          organization: u?.organization || '',
          p12Password: cert?.p12Password || getSignerP12Password(sId),
          serialNumber: cert?.serialNumber,
        };
      });

      const manifest: SignatureManifest = {
        protocol: 'LIGHTSIGN-v1',
        documentId: String(row['nomor_sertifikat'] || row['document_id'] || certId),
        stage: 0,
        targetFileName: fileName,
        fileHash,
        userListHash,
        policy: `${template.signers.length || stampElements.length}-of-${template.signers.length || stampElements.length}`,
        k: template.signers.length || stampElements.length,
        n: allUsers.length,
        version: 1,
        rawPayload: '',
        payloadHash: '',
        digitalSignatures: [],
        signatures: [],
        signerCredentials,
      };

      results.push({
        id: certId,
        rowNumber: rowNum,
        data: row,
        fileName,
        basePdfBytes,
        currentPdfBytes: basePdfBytes,
        status: 'base-ready',
        signedBy: [],
        manifest,
      });
    } catch (err: any) {
      console.error(`Error generating row ${rowNum}:`, err);
      results.push({
        id: certId,
        rowNumber: rowNum,
        data: row,
        fileName,
        basePdfBytes: new Uint8Array(),
        currentPdfBytes: new Uint8Array(),
        status: 'error',
        signedBy: [],
        manifest: {} as any,
        error: err?.message || 'Generation failed',
      });
    }

    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return results;
}

/**
 * Creates and downloads a ZIP bundle of all generated PDFs and their .sig.json manifests.
 */
export async function downloadAllCertificatesZip(
  certificates: GeneratedCertificate[],
  zipName = 'sertifikat-batch.zip'
) {
  const zip = new JSZip();

  for (const cert of certificates) {
    if (cert.status !== 'error' && cert.currentPdfBytes.length > 0) {
      zip.file(cert.fileName, cert.currentPdfBytes);
      zip.file(`${cert.fileName}.sig.json`, JSON.stringify(cert.manifest, null, 2));
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  triggerDownload(content, zipName);
}

/**
 * Helper to trigger browser file download
 */
export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
