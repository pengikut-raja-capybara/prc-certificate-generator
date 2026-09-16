import React, { useState } from 'react';
import { useEditorStore } from '../../stores/editor-store';
import {
  Type,
  Variable,
  Image as ImageIcon,
  QrCode,
  Stamp,
  Minus,
  Trash2,
  GripVertical,
} from 'lucide-react';

export const LayerPanel: React.FC = () => {
  const { template, selectedElementId, setSelectedElementId, removeElement, reorderElements } = useEditorStore();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const sortedElements = [...template.elements].sort((a, b) => b.zIndex - a.zIndex);

  const getIcon = (type: string) => {
    switch (type) {
      case 'dynamic-text':
        return <Variable size={14} color="#818cf8" />;
      case 'static-text':
        return <Type size={14} color="#94a3b8" />;
      case 'stamp-ttd':
        return <Stamp size={14} color="#34d399" />;
      case 'qr':
        return <QrCode size={14} color="#38bdf8" />;
      case 'image':
        return <ImageIcon size={14} color="#fbbf24" />;
      default:
        return <Minus size={14} />;
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      reorderElements(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div
      style={{
        width: '210px',
        minWidth: '210px',
        maxWidth: '210px',
        flexShrink: 0,
        height: '100%',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '0.5rem 0.65rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h4 style={{ fontSize: '0.72rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
          Layer ({template.elements.length})
        </h4>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Drag urutan</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0.4rem' }}>
        {sortedElements.map((el, index) => {
          const isSelected = el.id === selectedElementId;
          const isDragOver = dragOverIndex === index;
          const isDragging = draggedIndex === index;

          return (
            <div
              key={el.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => setSelectedElementId(el.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.3rem 0.4rem',
                borderRadius: '5px',
                cursor: 'grab',
                marginBottom: '0.15rem',
                background: isSelected
                  ? 'rgba(99, 102, 241, 0.18)'
                  : isDragOver
                  ? 'rgba(99, 102, 241, 0.3)'
                  : 'transparent',
                border: `1px solid ${
                  isSelected
                    ? 'rgba(99, 102, 241, 0.5)'
                    : isDragOver
                    ? 'var(--primary)'
                    : 'transparent'
                }`,
                opacity: isDragging ? 0.4 : 1,
                transform: isDragOver ? 'scale(1.02)' : 'none',
                transition: 'all 0.12s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                <span style={{ color: 'var(--text-muted)', cursor: 'grab' }}>
                  <GripVertical size={13} />
                </span>
                {getIcon(el.type)}
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {el.name || el.text || el.variable || el.type}
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeElement(el.id);
                }}
                className="btn-icon"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                }}
                title="Hapus"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
