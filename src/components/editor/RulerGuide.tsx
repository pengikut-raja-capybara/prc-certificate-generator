import React, { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../stores/editor-store';

interface RulerGuideProps {
  width: number;
  height: number;
  zoom?: number;
}

const RULER_THICKNESS = 20;

export const RulerGuide: React.FC<RulerGuideProps> = ({ width, height }) => {
  const { rulerEnabled, guides, addGuide, updateGuide, removeGuide } = useEditorStore();
  const topRulerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const leftRulerCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [activeDragGuide, setActiveDragGuide] = useState<{
    id?: string;
    type: 'h' | 'v';
    pos: number;
    isNew: boolean;
  } | null>(null);

  // Track mouse cursor over canvas to draw ruler indicator & crosshair
  useEffect(() => {
    if (!rulerEnabled) return;
    const handleMove = (e: MouseEvent) => {
      const paperEl = document.querySelector('.canvas-paper');
      if (!paperEl) return;
      const rect = paperEl.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        const scaleX = rect.width / width;
        const scaleY = rect.height / height;
        setMousePos({
          x: Math.round((e.clientX - rect.left) / scaleX),
          y: Math.round((e.clientY - rect.top) / scaleY),
        });
      } else {
        setMousePos(null);
      }
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [rulerEnabled, width, height]);

  // 1. Draw Top Horizontal Ruler
  useEffect(() => {
    if (!rulerEnabled) return;
    const canvas = topRulerCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = RULER_THICKNESS;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, RULER_THICKNESS);

    ctx.strokeStyle = '#334155';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const step = 50;
    const totalUnits = Math.ceil(width);

    for (let u = 0; u <= totalUnits; u += 10) {
      ctx.beginPath();
      if (u % 100 === 0) {
        ctx.moveTo(u, RULER_THICKNESS);
        ctx.lineTo(u, 4);
        ctx.stroke();
        ctx.fillText(`${u}`, u + 3, RULER_THICKNESS / 2);
      } else if (u % step === 0) {
        ctx.moveTo(u, RULER_THICKNESS);
        ctx.lineTo(u, 8);
        ctx.stroke();
      } else {
        ctx.moveTo(u, RULER_THICKNESS);
        ctx.lineTo(u, 14);
        ctx.stroke();
      }
    }

    // Draw mouse indicator on top ruler
    if (mousePos) {
      const mx = mousePos.x;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(mx, 0);
      ctx.lineTo(mx, RULER_THICKNESS);
      ctx.stroke();

      // Highlight coordinate badge on ruler
      ctx.fillStyle = '#0284c7';
      const badgeX = Math.max(0, Math.min(width - 32, mx - 16));
      ctx.fillRect(badgeX, 1, 32, 11);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${mousePos.x}`, Math.max(16, Math.min(width - 16, mx)), 7);
    }
  }, [width, rulerEnabled, mousePos]);

  // 2. Draw Left Vertical Ruler
  useEffect(() => {
    if (!rulerEnabled) return;
    const canvas = leftRulerCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = RULER_THICKNESS;
    canvas.height = height;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, RULER_THICKNESS, height);

    ctx.strokeStyle = '#334155';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '8px Inter, sans-serif';

    const step = 50;
    const totalUnits = Math.ceil(height);

    for (let u = 0; u <= totalUnits; u += 10) {
      ctx.beginPath();
      if (u % 100 === 0) {
        ctx.moveTo(RULER_THICKNESS, u);
        ctx.lineTo(4, u);
        ctx.stroke();

        ctx.save();
        ctx.translate(2, u + 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${u}`, 0, 8);
        ctx.restore();
      } else if (u % step === 0) {
        ctx.moveTo(RULER_THICKNESS, u);
        ctx.lineTo(8, u);
        ctx.stroke();
      } else {
        ctx.moveTo(RULER_THICKNESS, u);
        ctx.lineTo(14, u);
        ctx.stroke();
      }
    }

    // Draw mouse indicator on left ruler
    if (mousePos) {
      const my = mousePos.y;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, my);
      ctx.lineTo(RULER_THICKNESS, my);
      ctx.stroke();

      // Highlight coordinate badge on left ruler
      ctx.fillStyle = '#0284c7';
      const badgeY = Math.max(0, Math.min(height - 13, my - 6));
      ctx.fillRect(1, badgeY, 18, 13);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 7px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${mousePos.y}`, 10, Math.max(7, Math.min(height - 7, my)) + 2);
    }
  }, [height, rulerEnabled, mousePos]);

  // Listen to global mouse drag for pulling new guides or moving existing guides
  useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!activeDragGuide) return;

      const paperEl = document.querySelector('.canvas-paper');
      if (!paperEl) return;
      const rect = paperEl.getBoundingClientRect();
      const scaleX = rect.width / width;
      const scaleY = rect.height / height;

      if (activeDragGuide.type === 'h') {
        const rawY = (e.clientY - rect.top) / scaleY;
        const clampedY = Math.round(Math.max(0, Math.min(height, rawY)));
        setActiveDragGuide((prev) => (prev ? { ...prev, pos: clampedY } : null));
      } else {
        const rawX = (e.clientX - rect.left) / scaleX;
        const clampedX = Math.round(Math.max(0, Math.min(width, rawX)));
        setActiveDragGuide((prev) => (prev ? { ...prev, pos: clampedX } : null));
      }
    };

    const handleWindowMouseUp = () => {
      if (activeDragGuide) {
        if (activeDragGuide.isNew) {
          addGuide(activeDragGuide.type, activeDragGuide.pos);
        } else if (activeDragGuide.id) {
          updateGuide(activeDragGuide.id, activeDragGuide.pos);
        }
        setActiveDragGuide(null);
      }
    };

    if (activeDragGuide) {
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [activeDragGuide, width, height, addGuide, updateGuide]);

  if (!rulerEnabled) return null;

  return (
    <>
      {/* Corner intersection box */}
      <div
        style={{
          position: 'absolute',
          top: -RULER_THICKNESS,
          left: -RULER_THICKNESS,
          width: RULER_THICKNESS,
          height: RULER_THICKNESS,
          background: '#090d16',
          borderRight: '1px solid #334155',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '9px',
          color: '#64748b',
          zIndex: 50,
          userSelect: 'none',
        }}
        title="Titik Nol (0,0) - Tarik penggaris untuk membuat garis panduan"
      >
        pt
      </div>

      {/* Top Horizontal Ruler */}
      <div
        style={{
          position: 'absolute',
          top: -RULER_THICKNESS,
          left: 0,
          width: width,
          height: RULER_THICKNESS,
          zIndex: 45,
          cursor: 'row-resize',
          userSelect: 'none',
        }}
        onMouseDown={(e) => {
          const paperEl = document.querySelector('.canvas-paper');
          if (!paperEl) return;
          const rect = paperEl.getBoundingClientRect();
          const scaleY = rect.height / height;
          const initialY = Math.round((e.clientY - rect.top) / scaleY);
          setActiveDragGuide({ type: 'h', pos: Math.max(0, initialY), isNew: true });
        }}
        title="Klik dan tarik ke bawah untuk membuat garis panduan horizontal"
      >
        <canvas ref={topRulerCanvasRef} />
      </div>

      {/* Left Vertical Ruler */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: -RULER_THICKNESS,
          width: RULER_THICKNESS,
          height: height,
          zIndex: 45,
          cursor: 'col-resize',
          userSelect: 'none',
        }}
        onMouseDown={(e) => {
          const paperEl = document.querySelector('.canvas-paper');
          if (!paperEl) return;
          const rect = paperEl.getBoundingClientRect();
          const scaleX = rect.width / width;
          const initialX = Math.round((e.clientX - rect.left) / scaleX);
          setActiveDragGuide({ type: 'v', pos: Math.max(0, initialX), isNew: true });
        }}
        title="Klik dan tarik ke kanan untuk membuat garis panduan vertikal"
      >
        <canvas ref={leftRulerCanvasRef} />
      </div>

      {/* Dynamic Cursor Crosshair Lines (Rendered ON TOP of template) */}
      {mousePos && (
        <>
          {/* Horizontal crosshair line */}
          <div
            style={{
              position: 'absolute',
              top: mousePos.y,
              left: 0,
              width: '100%',
              height: '1px',
              borderTop: '1px dashed rgba(6, 182, 212, 0.75)',
              boxShadow: '0 0 3px rgba(6, 182, 212, 0.4)',
              pointerEvents: 'none',
              zIndex: 35,
            }}
          />
          {/* Vertical crosshair line */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: mousePos.x,
              width: '1px',
              height: '100%',
              borderLeft: '1px dashed rgba(6, 182, 212, 0.75)',
              boxShadow: '0 0 3px rgba(6, 182, 212, 0.4)',
              pointerEvents: 'none',
              zIndex: 35,
            }}
          />
          {/* Floating coordinate badge near cursor */}
          <div
            style={{
              position: 'absolute',
              top: Math.min(height - 24, mousePos.y + 8),
              left: Math.min(width - 70, mousePos.x + 8),
              background: 'rgba(15, 23, 42, 0.9)',
              backdropFilter: 'blur(4px)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '3px',
              padding: '1px 6px',
              fontSize: '9px',
              fontWeight: 600,
              pointerEvents: 'none',
              zIndex: 36,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            {mousePos.x}, {mousePos.y} pt
          </div>
        </>
      )}

      {/* Static Guide Lines */}
      {guides.map((guide) => {
        const isH = guide.type === 'h';
        const isDraggingThis = activeDragGuide?.id === guide.id;
        const currentPos = isDraggingThis ? activeDragGuide.pos : guide.pos;

        return (
          <div
            key={guide.id}
            onMouseDown={(e) => {
              e.stopPropagation();
              setActiveDragGuide({ id: guide.id, type: guide.type, pos: guide.pos, isNew: false });
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              removeGuide(guide.id);
            }}
            style={{
              position: 'absolute',
              top: isH ? currentPos - 3 : 0,
              left: isH ? 0 : currentPos - 3,
              width: isH ? '100%' : '7px',
              height: isH ? '7px' : '100%',
              cursor: isH ? 'row-resize' : 'col-resize',
              zIndex: 40,
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={`${isH ? 'Y' : 'X'}: ${guide.pos} pt (Klik dan geser untuk pindah, klik ganda untuk menghapus)`}
          >
            {/* Visible 1px glowing cyan guide line */}
            <div
              style={{
                width: isH ? '100%' : '1px',
                height: isH ? '1px' : '100%',
                backgroundColor: '#06b6d4',
                boxShadow: '0 0 5px #06b6d4',
                pointerEvents: 'none',
              }}
            />

            {/* Guide Coordinate Tag */}
            <div
              style={{
                position: 'absolute',
                top: isH ? -16 : 6,
                left: isH ? 10 : 6,
                background: '#06b6d4',
                color: '#090d16',
                padding: '1px 5px',
                borderRadius: '3px',
                fontSize: '9px',
                fontWeight: 700,
                pointerEvents: 'none',
                boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
                whiteSpace: 'nowrap',
              }}
            >
              {isH ? `Y: ${currentPos} pt` : `X: ${currentPos} pt`}
            </div>
          </div>
        );
      })}

      {/* Active Guide Line being dragged from ruler */}
      {activeDragGuide && activeDragGuide.isNew && (
        <div
          style={{
            position: 'absolute',
            top: activeDragGuide.type === 'h' ? activeDragGuide.pos : 0,
            left: activeDragGuide.type === 'h' ? 0 : activeDragGuide.pos,
            width: activeDragGuide.type === 'h' ? '100%' : '1px',
            height: activeDragGuide.type === 'h' ? '1px' : '100%',
            backgroundColor: '#38bdf8',
            boxShadow: '0 0 8px #38bdf8',
            cursor: activeDragGuide.type === 'h' ? 'row-resize' : 'col-resize',
            zIndex: 45,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: activeDragGuide.type === 'h' ? -18 : 6,
              left: activeDragGuide.type === 'h' ? 10 : 6,
              background: '#38bdf8',
              color: '#090d16',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '10px',
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
              whiteSpace: 'nowrap',
            }}
          >
            {activeDragGuide.type === 'h' ? `Y: ${activeDragGuide.pos} pt` : `X: ${activeDragGuide.pos} pt`}
          </div>
        </div>
      )}
    </>
  );
};
