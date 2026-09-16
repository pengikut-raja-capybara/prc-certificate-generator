import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  maxWidth = '240px',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; actualPosition: string }>({
    top: 0,
    left: 0,
    actualPosition: position,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const gap = 8;
    const tooltipApproxHeight = 45;

    // Check if there is enough space on top (at least 60px from top of viewport)
    let actualPos = position;
    if (position === 'top' && rect.top < tooltipApproxHeight + gap + 40) {
      actualPos = 'bottom';
    }

    let top = 0;
    let left = 0;

    if (actualPos === 'bottom') {
      top = rect.bottom + gap;
      left = rect.left + rect.width / 2;
    } else if (actualPos === 'left') {
      top = rect.top + rect.height / 2;
      left = rect.left - gap;
    } else if (actualPos === 'right') {
      top = rect.top + rect.height / 2;
      left = rect.right + gap;
    } else {
      // default top
      top = rect.top - gap;
      left = rect.left + rect.width / 2;
    }

    // Keep within horizontal screen bounds
    const safeLeft = Math.max(120, Math.min(window.innerWidth - 120, left));

    setCoords({ top, left: safeLeft, actualPosition: actualPos });
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible) {
      const handleScroll = () => updatePosition();
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [isVisible]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      {isVisible &&
        content &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="tooltip"
            className="ui-tooltip-box"
            style={{
              position: 'fixed',
              zIndex: 999999,
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform:
                coords.actualPosition === 'bottom'
                  ? 'translate(-50%, 0)'
                  : coords.actualPosition === 'top'
                  ? 'translate(-50%, -100%)'
                  : coords.actualPosition === 'left'
                  ? 'translate(-100%, -50%)'
                  : 'translate(0, -50%)',
              maxWidth,
              padding: '0.4rem 0.65rem',
              background: '#0f172a',
              color: '#f8fafc',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              borderRadius: '6px',
              fontSize: '0.72rem',
              lineHeight: 1.4,
              pointerEvents: 'none',
              boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.8), 0 0 12px rgba(99, 102, 241, 0.35)',
              whiteSpace: 'normal',
              textAlign: 'left',
              animation: 'fadeIn 0.12s ease-in-out',
            }}
          >
            {content}
          </div>,
          document.body
        )}
    </div>
  );
};

interface InfoTooltipProps {
  content: React.ReactNode;
  size?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  size = 12,
  position = 'top',
  maxWidth = '240px',
}) => {
  return (
    <Tooltip content={content} position={position} maxWidth={maxWidth}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          cursor: 'help',
          transition: 'color 0.15s ease',
          padding: '2px',
        }}
        className="info-tooltip-trigger"
      >
        <Info size={size} />
      </span>
    </Tooltip>
  );
};
