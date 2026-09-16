import React from 'react';
import { useEditorStore } from '../../stores/editor-store';
import { useKeysStore } from '../../stores/keys-store';
import { FontPicker } from './FontPicker';
import { StampStylePicker } from './StampStylePicker';
import { InfoTooltip } from '../shared/Tooltip';
import {
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkles,
} from 'lucide-react';
import type { StampStyleType } from '../../types/template';
import { CANONICAL_VARIABLES } from '../../lib/standards';


export const PropertiesPanel: React.FC = () => {
  const {
    template,
    selectedElementId,
    updateElement,
    removeElement,
    duplicateElement,
    bringForward,
    sendBackward,
  } = useEditorStore();

  const { signers } = useKeysStore();

  const selectedEl = template.elements.find((el) => el.id === selectedElementId);

  if (!selectedEl) {
    return (
      <div
        style={{
          width: '270px',
          minWidth: '270px',
          maxWidth: '270px',
          flexShrink: 0,
          height: '100%',
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-subtle)',
          padding: '0.65rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          overflowY: 'auto',
        }}
      >
        <div>
          <span className="badge badge-primary" style={{ marginBottom: '0.2rem', fontSize: '0.65rem' }}>
            Kanvas & Sertifikat
          </span>
          <h3 style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600 }}>
            Pengaturan Dokumen
          </h3>
        </div>

        {/* Paper Size Preset */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span>Ukuran Kertas Sertifikat</span>
            <InfoTooltip content="Pilih preset dimensi standar sertifikat internasional atau tentukan ukuran kustom." />
          </label>
          <select
            className="form-select"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
            value={template.dimensions.preset || 'A4-landscape'}
            onChange={(e) => useEditorStore.getState().setPagePreset(e.target.value as any)}
          >
            <option value="A4-landscape">A4 Landscape (297 × 210 mm)</option>
            <option value="A4-portrait">A4 Portrait (210 × 297 mm)</option>
            <option value="A5-landscape">A5 Landscape (210 × 148 mm)</option>
            <option value="A5-portrait">A5 Portrait (148 × 210 mm)</option>
            <option value="Letter-landscape">Letter Landscape</option>
            <option value="Letter-portrait">Letter Portrait</option>
            <option value="Custom">Kustom</option>
          </select>
        </div>

        {/* Dimensions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Lebar (pt):</span>
            <input
              type="number"
              className="form-input"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.4rem' }}
              value={Math.round(template.dimensions.width)}
              onChange={(e) =>
                useEditorStore.getState().setDimensions(Number(e.target.value), template.dimensions.height)
              }
            />
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tinggi (pt):</span>
            <input
              type="number"
              className="form-input"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.4rem' }}
              value={Math.round(template.dimensions.height)}
              onChange={(e) =>
                useEditorStore.getState().setDimensions(template.dimensions.width, Number(e.target.value))
              }
            />
          </div>
        </div>

        {/* Background Fit Mode */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.6rem' }}>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span>Mode Pas Latar Belakang (Fit)</span>
            <InfoTooltip content="Mode Cover menjaga rasio aspek proporsional dan mengisi seluruh bidang kanvas secara rapi." />
          </label>
          <select
            className="form-select"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
            value={template.background.fit || 'cover'}
            onChange={(e) => useEditorStore.getState().setBackgroundFit(e.target.value as any)}
          >
            <option value="cover">Cover (Penuh Rapi Tanpa Distorsi)</option>
            <option value="contain">Contain (Muat Utuh)</option>
            <option value="stretch">Stretch (Tarik Pas ke Ujung)</option>
          </select>
        </div>

        {/* Background Color Fallback */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.6rem' }}>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Warna Dasar Kanvas
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <input
              type="color"
              value={template.background.color || '#ffffff'}
              onChange={(e) => useEditorStore.getState().setBackgroundColor(e.target.value)}
              style={{ width: '26px', height: '26px', borderRadius: '4px', border: 'none', cursor: 'pointer', padding: 0 }}
            />
            <input
              type="text"
              className="form-input"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.4rem' }}
              value={template.background.color || '#ffffff'}
              onChange={(e) => useEditorStore.getState().setBackgroundColor(e.target.value)}
            />
          </div>
        </div>
      </div>
    );
  }

  const isText = selectedEl.type === 'static-text' || selectedEl.type === 'dynamic-text';
  const isStamp = selectedEl.type === 'stamp-ttd';
  const isQr = selectedEl.type === 'qr';

  return (
    <div
      style={{
        width: '270px',
        minWidth: '270px',
        maxWidth: '270px',
        flexShrink: 0,
        height: '100%',
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-subtle)',
        padding: '0.65rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
      }}
    >
      {/* Header with Title & Quick Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span className="badge badge-primary" style={{ textTransform: 'uppercase', fontSize: '0.65rem', padding: '0.1rem 0.35rem' }}>
            {selectedEl.type}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{selectedEl.id}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button
            className="btn btn-outline btn-sm btn-icon"
            onClick={() => duplicateElement(selectedEl.id)}
            title="Gandakan Elemen"
            style={{ padding: '0.25rem' }}
          >
            <Copy size={13} />
          </button>
          <button
            className="btn btn-outline btn-sm btn-icon"
            onClick={() => removeElement(selectedEl.id)}
            title="Hapus Elemen"
            style={{ color: '#f87171', padding: '0.25rem' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Element Name / Identifier */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span>Nama Elemen / Layer</span>
          <InfoTooltip content="Nama unik elemen ini di daftar layer kanvas." />
        </label>
        <input
          type="text"
          className="form-input"
          style={{ fontSize: '0.75rem', padding: '0.25rem 0.45rem' }}
          value={selectedEl.name || ''}
          onChange={(e) => {
            const newName = e.target.value;
            if (selectedEl.type === 'dynamic-text') {
              const cleanVar = newName.replace(/[^a-zA-Z0-9_-]/g, '_');
              updateElement(selectedEl.id, {
                name: newName,
                variable: `{{${cleanVar}}}`,
                text: `{{${cleanVar}}}`,
              });
            } else {
              updateElement(selectedEl.id, { name: newName });
            }
          }}
          placeholder="Nama elemen..."
        />
      </div>

      {/* Dynamic Text / Variable Config */}
      {selectedEl.type === 'dynamic-text' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span>Variabel Data (Key)</span>
            <InfoTooltip content="Variabel ini otomatis menjadi kolom tabel di Tahap 2 (Input Data) dan format file Excel/CSV." />
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.82rem' }}>{`{{`}</span>
            <input
              type="text"
              className="form-input"
              style={{ fontFamily: 'monospace', flex: 1, fontSize: '0.75rem', padding: '0.25rem 0.45rem' }}
              value={(selectedEl.variable || '').replace(/^\{\{|\}\}$/g, '')}
              onChange={(e) => {
                const key = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '_');
                updateElement(selectedEl.id, {
                  name: key || selectedEl.name,
                  variable: `{{${key}}}`,
                  text: `{{${key}}}`,
                });
              }}
              placeholder="var-1"
            />
            <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.82rem' }}>{`}}`}</span>
          </div>

          {/* Canonical Standard Variables Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Variabel Standar Resmi:</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {CANONICAL_VARIABLES.map((v) => {
                const isSelected = selectedEl.variable === `{{${v.key}}}`;
                return (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => {
                      updateElement(selectedEl.id, {
                        name: v.key,
                        variable: `{{${v.key}}}`,
                        text: `{{${v.key}}}`,
                      });
                    }}
                    style={{
                      fontSize: '0.64rem',
                      fontFamily: 'monospace',
                      padding: '0.12rem 0.35rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      border: isSelected ? '1px solid var(--primary-color)' : '1px solid var(--border-subtle)',
                      background: isSelected ? 'var(--primary-color)' : 'var(--bg-base)',
                      color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                      transition: 'all 0.1s ease',
                    }}
                    title={`${v.label} (Contoh: ${v.example})`}
                  >
                    {`{{${v.key}}}`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Static Text Config */}

      {selectedEl.type === 'static-text' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Isi Teks</label>
          <textarea
            className="form-textarea"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.45rem' }}
            rows={2}
            value={selectedEl.text || ''}
            onChange={(e) => updateElement(selectedEl.id, { text: e.target.value })}
          />
        </div>
      )}

      {/* Font & Typography Settings */}
      {isText && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Google Font</label>
            <FontPicker
              value={selectedEl.fontFamily || 'Inter'}
              onChange={(font) => updateElement(selectedEl.id, { fontFamily: font })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Ukuran Font</label>
              <input
                type="number"
                className="form-input"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.4rem' }}
                value={selectedEl.fontSize || 16}
                onChange={(e) => updateElement(selectedEl.id, { fontSize: Number(e.target.value) })}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Warna Teks</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input
                  type="color"
                  value={selectedEl.fill || '#0f172a'}
                  onChange={(e) => updateElement(selectedEl.id, { fill: e.target.value })}
                  style={{ width: '26px', height: '26px', borderRadius: '4px', border: 'none', cursor: 'pointer', padding: 0 }}
                />
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.4rem' }}
                  value={selectedEl.fill || '#0f172a'}
                  onChange={(e) => updateElement(selectedEl.id, { fill: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Alignment & Weight */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.2rem' }}>
              <button
                className={`btn btn-sm btn-icon ${selectedEl.textAlign === 'left' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => updateElement(selectedEl.id, { textAlign: 'left' })}
                style={{ padding: '0.25rem' }}
              >
                <AlignLeft size={13} />
              </button>
              <button
                className={`btn btn-sm btn-icon ${selectedEl.textAlign === 'center' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => updateElement(selectedEl.id, { textAlign: 'center' })}
                style={{ padding: '0.25rem' }}
              >
                <AlignCenter size={13} />
              </button>
              <button
                className={`btn btn-sm btn-icon ${selectedEl.textAlign === 'right' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => updateElement(selectedEl.id, { textAlign: 'right' })}
                style={{ padding: '0.25rem' }}
              >
                <AlignRight size={13} />
              </button>
            </div>

            <select
              className="form-select"
              style={{ width: 'auto', fontSize: '0.72rem', padding: '0.2rem 0.4rem' }}
              value={selectedEl.fontWeight || 'normal'}
              onChange={(e) => updateElement(selectedEl.id, { fontWeight: e.target.value })}
            >
              <option value="normal">Normal</option>
              <option value="500">Medium</option>
              <option value="600">Semi Bold</option>
              <option value="bold">Bold</option>
              <option value="900">Black</option>
            </select>
          </div>
        </div>
      )}

      {/* Stamp TTD Configuration */}
      {isStamp && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span>Label Slot Stempel</span>
              <InfoTooltip content="Identifikasi slot stempel tanda tangan di kanvas." />
            </label>
            <input
              type="text"
              className="form-input"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.45rem' }}
              value={selectedEl.name || ''}
              onChange={(e) => updateElement(selectedEl.id, { name: e.target.value })}
              placeholder="Slot TTD 1..."
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span>Tema Tampilan Stamp</span>
              <InfoTooltip content="Pilih layout visual stempel. Penentuan Authorized Signer akan diatur pada Tahap 2: Input Data." />
            </label>
            <StampStylePicker
              value={(selectedEl.stampStyle as StampStyleType) || 'A'}
              signerName={signers[0]?.name || 'Nama Penandatangan'}
              signerRole={signers[0]?.role || 'Jabatan Struktural'}
              organization={signers[0]?.organization || 'Institusi / Universitas'}
              onChange={(style, defaultW, defaultH) =>
                updateElement(selectedEl.id, {
                  stampStyle: style,
                  width: defaultW,
                  height: defaultH,
                })
              }
            />

            <button
              type="button"
              className="btn btn-outline btn-xs"
              onClick={() => {
                const style = selectedEl.stampStyle || 'A';
                const dims =
                  style === 'A'
                    ? { width: 220, height: 65 }
                    : style === 'B'
                    ? { width: 110, height: 110 }
                    : { width: 200, height: 70 };
                updateElement(selectedEl.id, dims);
              }}
              style={{ fontSize: '0.68rem', marginTop: '0.4rem', width: '100%', display: 'flex', justifyContent: 'center', gap: '0.3rem' }}
              title="Kembalikan ukuran stempel ke rasio proporsional standar agar tidak terdistorsi"
            >
              <Sparkles size={11} color="var(--primary-color)" />
              <span>Reset Proporsi Aspek Standar</span>
            </button>
          </div>
        </div>
      )}


      {/* QR Code Configuration */}
      {isQr && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span>Konten QR Verifikasi</span>
            <InfoTooltip content="URL verifikasi sertifikat. Anda dapat menyertakan {{var-1}} untuk link unik tiap peserta." />
          </label>
          <input
            type="text"
            className="form-input"
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.45rem' }}
            value={selectedEl.qrContentTemplate || ''}
            onChange={(e) => updateElement(selectedEl.id, { qrContentTemplate: e.target.value })}
            placeholder="https://verify.kuvukiland.ac.id/cert/{{var-1}}"
          />
        </div>
      )}

      {/* Shape / Garis Configuration */}
      {selectedEl.type === 'shape' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Warna Garis</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <input
              type="color"
              value={selectedEl.fill || '#cbd5e1'}
              onChange={(e) => updateElement(selectedEl.id, { fill: e.target.value })}
              style={{ width: '26px', height: '26px', borderRadius: '4px', border: 'none', cursor: 'pointer', padding: 0 }}
            />
            <input
              type="text"
              className="form-input"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.4rem' }}
              value={selectedEl.fill || '#cbd5e1'}
              onChange={(e) => updateElement(selectedEl.id, { fill: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* Position & Size */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.6rem' }}>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Posisi & Ukuran (pt)</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>X:</span>
            <input
              type="number"
              className="form-input"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.4rem' }}
              value={Math.round(selectedEl.x)}
              onChange={(e) => updateElement(selectedEl.id, { x: Number(e.target.value) })}
            />
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Y:</span>
            <input
              type="number"
              className="form-input"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.4rem' }}
              value={Math.round(selectedEl.y)}
              onChange={(e) => updateElement(selectedEl.id, { y: Number(e.target.value) })}
            />
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Lebar:</span>
            <input
              type="number"
              className="form-input"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.4rem' }}
              value={Math.round(selectedEl.width)}
              onChange={(e) => updateElement(selectedEl.id, { width: Number(e.target.value) })}
            />
          </div>
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tinggi:</span>
            <input
              type="number"
              className="form-input"
              style={{ fontSize: '0.75rem', padding: '0.25rem 0.4rem' }}
              value={Math.round(selectedEl.height)}
              onChange={(e) => updateElement(selectedEl.id, { height: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      {/* Layer Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.6rem' }}>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Urutan Layer (Z: {selectedEl.zIndex})</label>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button className="btn btn-secondary btn-sm" style={{ flex: 1, fontSize: '0.72rem', padding: '0.25rem' }} onClick={() => bringForward(selectedEl.id)}>
            <ArrowUp size={13} />
            <span>Maju Satu</span>
          </button>
          <button className="btn btn-secondary btn-sm" style={{ flex: 1, fontSize: '0.72rem', padding: '0.25rem' }} onClick={() => sendBackward(selectedEl.id)}>
            <ArrowDown size={13} />
            <span>Mundur Satu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
