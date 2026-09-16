import React, { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import QRCode from 'qrcode';
import { useEditorStore } from '../../stores/editor-store';
import { useKeysStore } from '../../stores/keys-store';
import { loadGoogleFont } from '../../lib/font-loader';
import type { TemplateElement } from '../../types/template';
import { RulerGuide } from './RulerGuide';

export const Canvas: React.FC = () => {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const objectsMapRef = useRef<Map<string, fabric.Object>>(new Map());
  const isDraggingOrModifyingRef = useRef<boolean>(false);
  const loadedBgSrcRef = useRef<string | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const {
    template,
    selectedElementId,
    setSelectedElementId,
    updateElement,
    removeElement,
    undo,
    redo,
    zoom,
    gridEnabled,
    snapToGrid,
    showSafeMargins,
  } = useEditorStore();

  const { signers, ca } = useKeysStore();
  const showSafeMarginsRef = useRef(showSafeMargins);
  showSafeMarginsRef.current = showSafeMargins;

  useEffect(() => {
    fabricCanvasRef.current?.requestRenderAll();
  }, [showSafeMargins]);


  // Global Keyboard Shortcuts (Delete, Backspace, Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.tagName === 'SELECT' ||
        (activeEl as HTMLElement)?.isContentEditable;

      if (isInput) return; // Allow normal input typing

      // Delete shortcut
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          e.preventDefault();
          removeElement(selectedElementId);
        }
      }

      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }

      // Redo: Ctrl+Y or Cmd+Y
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, removeElement, undo, redo]);

  // Helper to synchronously render high-DPI dummy stamp canvas for FabricImage
  const renderStampToCanvas = (
    el: TemplateElement,
    targetSigner: { name: string; role: string; organization?: string }
  ): HTMLCanvasElement => {
    const w = el.width;
    const h = el.height;
    const dpr = 2;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.scale(dpr, dpr);

    const style = el.stampStyle || 'A';
    const signerName = targetSigner?.name || el.name || 'Nama Penandatangan';
    const signerRole = targetSigner?.role || 'Jabatan / Institusi';
    const serial = 'SN-VERIFIED-X509';

    const drawQR = (qx: number, qy: number, qrSize: number, payload: any) => {
      try {
        const qr = QRCode.create(JSON.stringify(payload), { errorCorrectionLevel: 'L' });
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
        console.error('Error drawing QR on canvas:', e);
      }
    };

    if (style === 'A') {
      // Style A: Formal Academic (Seamless text + QR, no card border)
      const qrSize = Math.min(h - 8, 54);
      const qrX = w - qrSize;
      const qrY = (h - qrSize) / 2;
      drawQR(qrX, qrY, qrSize, { nama: signerName, noSeri: serial });

      const rightText = qrX - 8;
      ctx.textAlign = 'right';

      ctx.fillStyle = '#64748b';
      ctx.font = '7px Inter, sans-serif';
      ctx.fillText('Ditandatangani secara elektronik oleh:', rightText, 10);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillText(signerName, rightText, 24);

      ctx.fillStyle = '#334155';
      ctx.font = '8px Inter, sans-serif';
      ctx.fillText(signerRole, rightText, 38);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'italic 7px Inter, sans-serif';
      ctx.fillText(`No. Seri: ${serial}`, rightText, 50);
    } else if (style === 'B') {
      // Style B: QR Centered on top (clean minimalist)
      const qrSize = Math.min(w * 0.5, h * 0.55, 52);
      const qrX = (w - qrSize) / 2;
      const qrY = 4;
      drawQR(qrX, qrY, qrSize, { nama: signerName, noSeri: serial });

      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 9.5px Inter, sans-serif';
      ctx.fillText(signerName, w / 2, qrY + qrSize + 12);

      ctx.fillStyle = '#475569';
      ctx.font = '8px Inter, sans-serif';
      ctx.fillText(signerRole, w / 2, qrY + qrSize + 24);
    } else {
      // Style C: Minimalist Typography
      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748b';
      ctx.font = '7px Inter, sans-serif';
      ctx.fillText('Ditandatangani secara elektronik oleh:', 4, 10);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 10.5px Inter, sans-serif';
      ctx.fillText(signerName, 4, 24);

      ctx.fillStyle = '#334155';
      ctx.font = '8.5px Inter, sans-serif';
      ctx.fillText(signerRole, 4, 38);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'italic 7px Inter, sans-serif';
      ctx.fillText(`No. Seri: ${serial}`, 4, 50);
    }

    return canvas;
  };

  // Helper to create a fabric object for a given TemplateElement
  const createFabricObject = async (el: TemplateElement): Promise<fabric.Object> => {
    if (el.type === 'dynamic-text' || el.type === 'static-text') {
      if (el.fontFamily) {
        await loadGoogleFont(el.fontFamily);
      }
      const rawText = el.type === 'dynamic-text' ? el.variable || el.text || '' : el.text || '';
      const textObj = new fabric.Textbox(rawText, {
        left: el.x,
        top: el.y,
        width: el.width,
        fontSize: el.fontSize || 18,
        fontFamily: el.fontFamily || 'Inter',
        fontWeight: (el.fontWeight as any) || 'normal',
        fontStyle: el.fontStyle || 'normal',
        fill: el.fill || '#0f172a',
        textAlign: (el.textAlign as any) || 'left',
        originX: 'left',
        originY: 'top',
        lockScalingY: true, // Preserve font size and adjust width only
      });
      textObj.setControlsVisibility({
        mt: false,
        mb: false,
      });
      (textObj as any).elementId = el.id;
      return textObj;
    } else if (el.type === 'stamp-ttd') {
      const targetSigner = signers.find((s) => s.id === el.signerId) || (template.signers && template.signers.find((s) => s.id === el.signerId)) || {
        name: 'Belum Ditentukan',
        role: 'Pilih Authorized Signer di Tahap 2',
        organization: ca?.organization || 'Organisasi Penerbit',
      };

      const stampCanvas = renderStampToCanvas(el, targetSigner);
      const stampImg = new fabric.FabricImage(stampCanvas, {
        left: el.x,
        top: el.y,
        scaleX: 0.5,
        scaleY: 0.5,
        originX: 'left',
        originY: 'top',
      });
      (stampImg as any).elementId = el.id;
      (stampImg as any).lastStampKey = `${el.stampStyle || 'A'}-${el.signerId}-${el.width}-${el.height}`;
      return stampImg;
    } else if (el.type === 'qr') {
      const qrRect = new fabric.Rect({
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        fill: '#f1f5f9',
        stroke: '#0284c7',
        strokeWidth: 1,
        rx: 4,
        ry: 4,
      });

      const qrLabel = new fabric.FabricText('QR VERIFIKASI', {
        fontSize: 8,
        fontFamily: 'Inter',
        fontWeight: 'bold',
        fill: '#0284c7',
        left: el.x + 6,
        top: el.y + el.height / 2 - 4,
      });

      const group = new fabric.Group([qrRect, qrLabel], {
        left: el.x,
        top: el.y,
      });
      (group as any).elementId = el.id;
      return group;
    } else {
      // Shape
      const rect = new fabric.Rect({
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        fill: el.fill || '#cbd5e1',
      });
      (rect as any).elementId = el.id;
      return rect;
    }
  };

  // 1. Initialize Fabric Canvas Once
  useEffect(() => {
    if (!canvasElRef.current) return;

    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: template.dimensions.width,
      height: template.dimensions.height,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
      renderOnAddRemove: false, // Performance boost
    });

    fabricCanvasRef.current = canvas;

    // Selection events
    const updateSelection = (e: any) => {
      const selected = e.selected?.[0];
      if (selected && selected.elementId) {
        setSelectedElementId(selected.elementId);
      }
    };

    canvas.on('selection:created', updateSelection);
    canvas.on('selection:updated', updateSelection);
    canvas.on('selection:cleared', () => {
      setSelectedElementId(null);
    });

    // Smart Alignment Guidelines (Canva-style smart guides)
    const smartGuidesRef: { current: Array<{ type: 'h' | 'v'; pos: number }> } = { current: [] };

    canvas.on('after:render', () => {
      const ctx = canvas.getContext();

      // Standard ISO 216 / ANSI Safe Print Margins (15mm ≈ 42.5pt)
      if (showSafeMarginsRef.current) {
        const w = template.dimensions.width;
        const h = template.dimensions.height;
        const m = 42.5;
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)'; // Soft cyan border
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(m, m, Math.max(10, w - m * 2), Math.max(10, h - m * 2));
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
        ctx.fillText('Batas Aman Cetak (15mm)', m + 4, m - 4);
        ctx.restore();
      }

      const guides = smartGuidesRef.current;
      if (!guides || guides.length === 0) return;

      ctx.save();
      ctx.strokeStyle = '#ec4899'; // Canva-style magenta
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);

      for (const g of guides) {
        ctx.beginPath();
        if (g.type === 'v') {
          ctx.moveTo(g.pos, 0);
          ctx.lineTo(g.pos, canvas.getHeight());
        } else {
          ctx.moveTo(0, g.pos);
          ctx.lineTo(canvas.getWidth(), g.pos);
        }
        ctx.stroke();
      }
      ctx.restore();
    });


    // Object moving/scaling events
    canvas.on('object:moving', (e: any) => {
      isDraggingOrModifyingRef.current = true;
      const target = e.target;
      if (!target) return;

      const threshold = 6;
      const activeGuides: Array<{ type: 'h' | 'v'; pos: number }> = [];

      const targetLeft = target.left || 0;
      const targetTop = target.top || 0;
      const targetW = (target.width || 0) * (target.scaleX || 1);
      const targetH = (target.height || 0) * (target.scaleY || 1);
      const targetCenterX = targetLeft + targetW / 2;
      const targetCenterY = targetTop + targetH / 2;
      const targetRight = targetLeft + targetW;
      const targetBottom = targetTop + targetH;

      // 1. Check Alignment with Canvas Center
      const canvasCenterX = template.dimensions.width / 2;
      const canvasCenterY = template.dimensions.height / 2;

      // Vertical center line
      if (Math.abs(targetCenterX - canvasCenterX) < threshold) {
        target.set({ left: canvasCenterX - targetW / 2 });
        activeGuides.push({ type: 'v', pos: canvasCenterX });
      } else if (Math.abs(targetLeft - canvasCenterX) < threshold) {
        target.set({ left: canvasCenterX });
        activeGuides.push({ type: 'v', pos: canvasCenterX });
      } else if (Math.abs(targetRight - canvasCenterX) < threshold) {
        target.set({ left: canvasCenterX - targetW });
        activeGuides.push({ type: 'v', pos: canvasCenterX });
      }

      // Horizontal center line
      if (Math.abs(targetCenterY - canvasCenterY) < threshold) {
        target.set({ top: canvasCenterY - targetH / 2 });
        activeGuides.push({ type: 'h', pos: canvasCenterY });
      }

      // 2. Check Alignment with other objects on canvas
      const objects = canvas.getObjects();
      for (const other of objects) {
        if (other === target || !(other as any).elementId) continue;

        const oLeft = other.left || 0;
        const oTop = other.top || 0;
        const oW = (other.width || 0) * (other.scaleX || 1);
        const oH = (other.height || 0) * (other.scaleY || 1);
        const oCenterX = oLeft + oW / 2;
        const oCenterY = oTop + oH / 2;
        const oRight = oLeft + oW;
        const oBottom = oTop + oH;

        // X-axis alignment (Vertical guide line)
        if (Math.abs(targetCenterX - oCenterX) < threshold) {
          target.set({ left: oCenterX - targetW / 2 });
          activeGuides.push({ type: 'v', pos: oCenterX });
        } else if (Math.abs(targetLeft - oLeft) < threshold) {
          target.set({ left: oLeft });
          activeGuides.push({ type: 'v', pos: oLeft });
        } else if (Math.abs(targetRight - oRight) < threshold) {
          target.set({ left: oRight - targetW });
          activeGuides.push({ type: 'v', pos: oRight });
        } else if (Math.abs(targetLeft - oRight) < threshold) {
          target.set({ left: oRight });
          activeGuides.push({ type: 'v', pos: oRight });
        } else if (Math.abs(targetRight - oLeft) < threshold) {
          target.set({ left: oLeft - targetW });
          activeGuides.push({ type: 'v', pos: oLeft });
        }

        // Y-axis alignment (Horizontal guide line)
        if (Math.abs(targetCenterY - oCenterY) < threshold) {
          target.set({ top: oCenterY - targetH / 2 });
          activeGuides.push({ type: 'h', pos: oCenterY });
        } else if (Math.abs(targetTop - oTop) < threshold) {
          target.set({ top: oTop });
          activeGuides.push({ type: 'h', pos: oTop });
        } else if (Math.abs(targetBottom - oBottom) < threshold) {
          target.set({ top: oBottom - targetH });
          activeGuides.push({ type: 'h', pos: oBottom });
        } else if (Math.abs(targetTop - oBottom) < threshold) {
          target.set({ top: oBottom });
          activeGuides.push({ type: 'h', pos: oBottom });
        } else if (Math.abs(targetBottom - oTop) < threshold) {
          target.set({ top: oTop - targetH });
          activeGuides.push({ type: 'h', pos: oTop });
        }
      }

      smartGuidesRef.current = activeGuides;
      canvas.requestRenderAll();
    });

    const clearSmartGuides = () => {
      if (smartGuidesRef.current.length > 0) {
        smartGuidesRef.current = [];
        canvas.requestRenderAll();
      }
    };

    canvas.on('mouse:up', clearSmartGuides);

    canvas.on('object:scaling', (e: any) => {
      isDraggingOrModifyingRef.current = true;
      const obj = e.target;
      if (obj && (obj instanceof fabric.Textbox || obj.type === 'textbox')) {
        const textObj = obj as fabric.Textbox;
        const newWidth = Math.max(30, (textObj.width || 50) * (textObj.scaleX || 1));
        textObj.set({
          width: newWidth,
          scaleX: 1,
          scaleY: 1,
        });
        textObj.setCoords();
      }
    });

    canvas.on('object:modified', (e: any) => {
      const obj = e.target;
      if (!obj || !obj.elementId) return;

      isDraggingOrModifyingRef.current = true;
      let left = obj.left || 0;
      let top = obj.top || 0;
      let width = (obj.width || 0) * (obj.scaleX || 1);
      let height = (obj.height || 0) * (obj.scaleY || 1);

      if (obj instanceof fabric.Textbox || obj.type === 'textbox') {
        width = Math.max(30, (obj.width || 50) * (obj.scaleX || 1));
        obj.set({
          width,
          scaleX: 1,
          scaleY: 1,
        });
        obj.setCoords();
        height = obj.height || 40;
      }

      if (snapToGrid) {
        const gridSize = 10;
        left = Math.round(left / gridSize) * gridSize;
        top = Math.round(top / gridSize) * gridSize;
        obj.set({ left, top });
      }

      updateElement(obj.elementId, {
        x: Math.round(left),
        y: Math.round(top),
        width: Math.round(width),
        height: Math.round(height),
        rotation: Math.round(obj.angle || 0),
      });

      clearSmartGuides();
      canvas.requestRenderAll();
      // Unlock after short delay
      setTimeout(() => {
        isDraggingOrModifyingRef.current = false;
      }, 60);
    });

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
      objectsMapRef.current.clear();
      loadedBgSrcRef.current = null;
    };
  }, []);

  const currentBgImgRef = useRef<fabric.FabricImage | null>(null);

  // Helper to scale background according to fit mode (cover, contain, stretch)
  const applyBackgroundFit = (
    canvas: fabric.Canvas,
    bgImg: fabric.FabricImage,
    canvasW: number,
    canvasH: number,
    fit: 'cover' | 'contain' | 'stretch'
  ) => {
    const imgW = bgImg.width || 1;
    const imgH = bgImg.height || 1;
    const scaleX = canvasW / imgW;
    const scaleY = canvasH / imgH;

    if (fit === 'cover') {
      const scale = Math.max(scaleX, scaleY);
      bgImg.set({
        scaleX: scale,
        scaleY: scale,
        originX: 'center',
        originY: 'center',
        left: canvasW / 2,
        top: canvasH / 2,
        selectable: false,
        evented: false,
      });
    } else if (fit === 'contain') {
      const scale = Math.min(scaleX, scaleY);
      bgImg.set({
        scaleX: scale,
        scaleY: scale,
        originX: 'center',
        originY: 'center',
        left: canvasW / 2,
        top: canvasH / 2,
        selectable: false,
        evented: false,
      });
    } else {
      // stretch
      bgImg.set({
        scaleX: scaleX,
        scaleY: scaleY,
        originX: 'left',
        originY: 'top',
        left: 0,
        top: 0,
        selectable: false,
        evented: false,
      });
    }
    canvas.backgroundImage = bgImg;
  };

  // 2. Manage Canvas Dimensions & Background Image smoothly
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Update canvas size if dimensions changed
    canvas.setDimensions({
      width: template.dimensions.width,
      height: template.dimensions.height,
    });

    const bgSrc = template.background.src;
    const fit = template.background.fit || 'cover';

    if (template.background.type === 'image' && bgSrc) {
      if (bgSrc !== loadedBgSrcRef.current) {
        loadedBgSrcRef.current = bgSrc;
        fabric.FabricImage.fromURL(bgSrc, { crossOrigin: 'anonymous' })
          .then((bgImg) => {
            if (!fabricCanvasRef.current) return;
            currentBgImgRef.current = bgImg;
            applyBackgroundFit(
              canvas,
              bgImg,
              template.dimensions.width,
              template.dimensions.height,
              fit
            );
            canvas.requestRenderAll();
          })
          .catch((e) => console.warn('Canvas BG load error:', e));
      } else if (currentBgImgRef.current) {
        // Source is same, but dimensions or fit changed: re-apply fit immediately!
        applyBackgroundFit(
          canvas,
          currentBgImgRef.current,
          template.dimensions.width,
          template.dimensions.height,
          fit
        );
        canvas.requestRenderAll();
      }
    } else if (template.background.type === 'color') {
      canvas.backgroundImage = undefined;
      canvas.backgroundColor = template.background.color || '#ffffff';
      canvas.requestRenderAll();
    }
  }, [
    template.background.src,
    template.background.type,
    template.background.color,
    template.background.fit,
    template.dimensions.width,
    template.dimensions.height,
  ]);

  // 3. Sync Elements incrementally without tearing down canvas
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // If user is actively dragging in Fabric, don't interfere
    if (isDraggingOrModifyingRef.current) return;

    const objectsMap = objectsMapRef.current;
    const currentElementIds = new Set(template.elements.map((e) => e.id));

    // Remove deleted objects
    for (const [id, obj] of objectsMap.entries()) {
      if (!currentElementIds.has(id)) {
        canvas.remove(obj);
        objectsMap.delete(id);
      }
    }

    // Add or update elements
    const syncElements = async () => {
      for (const el of template.elements) {
        let obj = objectsMap.get(el.id);

        if (!obj) {
          // New element added!
          obj = await createFabricObject(el);
          objectsMap.set(el.id, obj);
          canvas.add(obj);
        } else {
          // Element already exists, update properties smoothly if changed
          if (el.type === 'dynamic-text' || el.type === 'static-text') {
            const rawText = el.type === 'dynamic-text' ? el.variable || el.text || '' : el.text || '';
            const textbox = obj as fabric.Textbox;
            let needsRender = false;

            if (textbox.text !== rawText) {
              textbox.set({ text: rawText });
              needsRender = true;
            }
            if (textbox.left !== el.x || textbox.top !== el.y) {
              textbox.set({ left: el.x, top: el.y });
              needsRender = true;
            }
            if (textbox.width !== el.width) {
              textbox.set({ width: el.width });
              needsRender = true;
            }
            if (textbox.fontSize !== el.fontSize) {
              textbox.set({ fontSize: el.fontSize || 18 });
              needsRender = true;
            }
            if (textbox.fontFamily !== el.fontFamily) {
              if (el.fontFamily) await loadGoogleFont(el.fontFamily);
              textbox.set({ fontFamily: el.fontFamily || 'Inter' });
              needsRender = true;
            }
            if (textbox.fill !== el.fill) {
              textbox.set({ fill: el.fill || '#0f172a' });
              needsRender = true;
            }
            if (textbox.textAlign !== el.textAlign) {
              textbox.set({ textAlign: (el.textAlign as any) || 'left' });
              needsRender = true;
            }
            if (needsRender) {
              textbox.setCoords();
            }
          } else if (el.type === 'stamp-ttd') {
            const stampKey = `${el.stampStyle || 'A'}-${el.signerId}-${el.width}-${el.height}`;
            if ((obj as any).lastStampKey !== stampKey) {
              const targetSigner = signers.find((s) => s.id === el.signerId) || (template.signers && template.signers.find((s) => s.id === el.signerId)) || {
                name: 'Belum Ditentukan',
                role: 'Pilih Authorized Signer di Tahap 2',
                organization: ca?.organization || 'Organisasi Penerbit',
              };
              const newCanvas = renderStampToCanvas(el, targetSigner);
              (obj as fabric.FabricImage).setElement(newCanvas);
              (obj as any).lastStampKey = stampKey;
              obj.set({
                left: el.x,
                top: el.y,
                scaleX: 0.5,
                scaleY: 0.5,
              });
              obj.setCoords();
            } else if (obj.left !== el.x || obj.top !== el.y) {
              obj.set({ left: el.x, top: el.y });
              obj.setCoords();
            }
          } else {
            // For other objects, update position and coordinates
            if (obj.left !== el.x || obj.top !== el.y) {
              obj.set({ left: el.x, top: el.y });
              obj.setCoords();
            }
          }
        }
      }

      canvas.requestRenderAll();
    };

    syncElements();
  }, [template.elements]);

  // 4. Sync Selection without tearing down canvas
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const active = canvas.getActiveObject();
    const currentActiveId = (active as any)?.elementId;

    if (currentActiveId === selectedElementId) {
      return; // Already selected on canvas
    }

    if (!selectedElementId) {
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      return;
    }

    const targetObj = objectsMapRef.current.get(selectedElementId);
    if (targetObj) {
      canvas.setActiveObject(targetObj);
      canvas.requestRenderAll();
    }
  }, [selectedElementId]);

  // 5. Fit to screen logic
  const fitToScreen = () => {
    if (!viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const availW = rect.width - 56;
    const availH = rect.height - 56;
    if (availW <= 0 || availH <= 0) return;

    const scaleW = availW / template.dimensions.width;
    const scaleH = availH / template.dimensions.height;
    const fitScale = Math.min(scaleW, scaleH, 1.0);
    const rounded = Math.floor(fitScale * 100) / 100;
    useEditorStore.getState().setZoom(Math.max(0.2, rounded));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fitToScreen();
    }, 60);

    const handleResize = () => fitToScreen();
    window.addEventListener('resize', handleResize);
    window.addEventListener('canvas:fit-to-screen', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('canvas:fit-to-screen', handleResize);
    };
  }, [template.dimensions.width, template.dimensions.height]);

  return (
    <div
      ref={viewportRef}
      className="canvas-viewport"
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        height: '100%',
        width: '100%',
        position: 'relative',
        padding: '24px',
        overflow: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Scaled bounding wrapper matching the visual canvas footprint */}
      <div
        style={{
          width: `${Math.round(template.dimensions.width * zoom)}px`,
          height: `${Math.round(template.dimensions.height * zoom)}px`,
          position: 'relative',
          flexShrink: 0,
          transition: 'width 0.1s ease, height 0.1s ease',
        }}
      >
        <div
          className="canvas-paper"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            width: template.dimensions.width,
            height: template.dimensions.height,
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}
        >
          <canvas ref={canvasElRef} />

          {gridEnabled && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundImage:
                  'linear-gradient(to right, rgba(99, 102, 241, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(99, 102, 241, 0.15) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            />
          )}

          <RulerGuide width={template.dimensions.width} height={template.dimensions.height} zoom={1} />
        </div>
      </div>
    </div>
  );
};
