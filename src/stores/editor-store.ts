import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { type TemplateConfig, type TemplateElement, type ElementType, type PagePreset, PAGE_PRESETS } from '../types/template';
import { DEFAULT_CERTIFICATE_TEMPLATE } from '../data/default-template';
import { indexedDbStorage } from '../lib/storage';
import { useGeneratorStore } from './generator-store';

interface HistoryState {
  past: TemplateConfig[];
  future: TemplateConfig[];
}

interface EditorState {
  template: TemplateConfig;
  selectedElementId: string | null;
  zoom: number;
  gridEnabled: boolean;
  snapToGrid: boolean;
  rulerEnabled: boolean;
  showSafeMargins: boolean;
  guides: Array<{ id: string; type: 'h' | 'v'; pos: number }>;
  history: HistoryState;

  // Actions
  setTemplate: (template: TemplateConfig) => void;
  resetTemplate: () => void;
  setSelectedElementId: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  toggleRuler: () => void;
  toggleSafeMargins: () => void;
  addGuide: (type: 'h' | 'v', pos: number) => void;

  updateGuide: (id: string, pos: number) => void;
  removeGuide: (id: string) => void;
  clearGuides: () => void;

  addElement: (type: ElementType, customProps?: Partial<TemplateElement>) => void;
  updateElement: (id: string, updates: Partial<TemplateElement>) => void;
  removeElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  reorderElements: (fromIndex: number, toIndex: number) => void;

  setBackgroundImage: (src: string) => void;
  setBackgroundColor: (color: string) => void;
  setBackgroundFit: (fit: 'cover' | 'contain' | 'stretch') => void;
  setPagePreset: (preset: PagePreset) => void;
  setDimensions: (width: number, height: number) => void;

  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
}

const notifyTemplateChange = () => {
  try {
    useGeneratorStore.getState().markTemplateDirty();
  } catch {
    // Ignore store cycle during initial load
  }
};

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      template: DEFAULT_CERTIFICATE_TEMPLATE,
      selectedElementId: 'el-name',
      zoom: 1,
      gridEnabled: false,
      snapToGrid: true,
      rulerEnabled: true,
      showSafeMargins: true,
      guides: [],
      history: {
        past: [],
        future: [],
      },

      setTemplate: (template) => {
        set({ template, selectedElementId: null });
        notifyTemplateChange();
      },

      resetTemplate: () => {
        const cleanTemplate = JSON.parse(JSON.stringify(DEFAULT_CERTIFICATE_TEMPLATE));
        cleanTemplate.signers = [];
        set({
          template: cleanTemplate,
          selectedElementId: null,
          history: { past: [], future: [] },
          zoom: 1,
        });
        notifyTemplateChange();
      },

  setSelectedElementId: (id) => set({ selectedElementId: id }),

  setZoom: (zoom) => set({ zoom: Math.max(0.2, Math.min(2.5, zoom)) }),

  toggleGrid: () => set((state) => ({ gridEnabled: !state.gridEnabled })),

  toggleSnapToGrid: () => set((state) => ({ snapToGrid: !state.snapToGrid })),

  toggleRuler: () => set((state) => ({ rulerEnabled: !state.rulerEnabled })),

  toggleSafeMargins: () => set((state) => ({ showSafeMargins: !state.showSafeMargins })),


  addGuide: (type, pos) =>
    set((state) => ({
      guides: [
        ...state.guides,
        { id: `guide-${Date.now().toString(36)}`, type, pos: Math.round(pos) },
      ],
    })),

  updateGuide: (id, pos) =>
    set((state) => ({
      guides: state.guides.map((g) => (g.id === id ? { ...g, pos: Math.round(pos) } : g)),
    })),

  removeGuide: (id) =>
    set((state) => ({
      guides: state.guides.filter((g) => g.id !== id),
    })),

  clearGuides: () => set({ guides: [] }),

  pushHistory: () => {
    const { template, history } = get();
    set({
      history: {
        past: [...history.past.slice(-20), JSON.parse(JSON.stringify(template))],
        future: [],
      },
    });
  },

  addElement: (type, customProps = {}) => {
    const { template, pushHistory } = get();
    pushHistory();

    const id = `el-${Date.now().toString(36)}`;
    const highestZ = template.elements.reduce((max, el) => Math.max(max, el.zIndex), 0);

    const getNextIndex = (prefix: string) => {
      let maxNum = 0;
      const regex = new RegExp(`^${prefix}-(\\d+)$`, 'i');
      template.elements.forEach((el) => {
        const match = el.name?.match(regex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });
      return maxNum + 1;
    };

    let defaultEl: TemplateElement = {
      id,
      type,
      name: `elemen-1`,
      x: 100,
      y: 100,
      width: 200,
      height: 40,
      zIndex: highestZ + 1,
    };

    if (type === 'static-text') {
      const idx = getNextIndex('teks');
      defaultEl = {
        ...defaultEl,
        name: `teks-${idx}`,
        text: `Teks ${idx}`,
        fontFamily: 'Inter',
        fontSize: 16,
        fill: '#1e293b',
        textAlign: 'left',
      };
    } else if (type === 'dynamic-text') {
      const idx = getNextIndex('var');
      defaultEl = {
        ...defaultEl,
        name: `var-${idx}`,
        variable: `{{var-${idx}}}`,
        text: `{{var-${idx}}}`,
        fontFamily: 'Playfair Display',
        fontSize: 24,
        fontWeight: 'bold',
        fill: '#0f172a',
        textAlign: 'center',
        width: 300,
        height: 40,
      };
    } else if (type === 'qr') {
      const idx = getNextIndex('qr');
      defaultEl = {
        ...defaultEl,
        name: `qr-${idx}`,
        width: 80,
        height: 80,
        qrContentTemplate: 'https://verify.kuvukiland.ac.id/cert/{{var-1}}',
      };
    } else if (type === 'stamp-ttd') {
      const idx = getNextIndex('stamp');
      defaultEl = {
        ...defaultEl,
        name: `stamp-${idx}`,
        width: 220,
        height: 65,
        stampStyle: 'A',
      };
    } else if (type === 'shape') {
      const idx = getNextIndex('garis');
      defaultEl = {
        ...defaultEl,
        name: `garis-${idx}`,
        width: 400,
        height: 2,
        fill: '#cbd5e1',
      };
    }

    const newElement = { ...defaultEl, ...customProps };
    set({
      template: {
        ...template,
        elements: [...template.elements, newElement],
      },
      selectedElementId: id,
    });
    notifyTemplateChange();
  },

  updateElement: (id, updates) => {
    const { template } = get();
    set({
      template: {
        ...template,
        elements: template.elements.map((el) => (el.id === id ? { ...el, ...updates } : el)),
      },
    });
    notifyTemplateChange();
  },


  removeElement: (id) => {
    const { template, pushHistory } = get();
    pushHistory();
    set({
      template: {
        ...template,
        elements: template.elements.filter((el) => el.id !== id),
      },
      selectedElementId: null,
    });
    notifyTemplateChange();
  },

  duplicateElement: (id) => {
    const { template, pushHistory } = get();
    const target = template.elements.find((el) => el.id === id);
    if (!target) return;

    pushHistory();
    const newId = `el-${Date.now().toString(36)}`;
    const highestZ = template.elements.reduce((max, el) => Math.max(max, el.zIndex), 0);
    const copy: TemplateElement = {
      ...JSON.parse(JSON.stringify(target)),
      id: newId,
      name: `${target.name} (Salinan)`,
      x: target.x + 20,
      y: target.y + 20,
      zIndex: highestZ + 1,
    };

    set({
      template: {
        ...template,
        elements: [...template.elements, copy],
      },
      selectedElementId: newId,
    });
    notifyTemplateChange();
  },

  bringForward: (id) => {
    const { template } = get();
    const index = template.elements.findIndex((e) => e.id === id);
    if (index === -1) return;

    set({
      template: {
        ...template,
        elements: template.elements.map((e) => (e.id === id ? { ...e, zIndex: e.zIndex + 1 } : e)),
      },
    });
    notifyTemplateChange();
  },

  sendBackward: (id) => {
    const { template } = get();
    set({
      template: {
        ...template,
        elements: template.elements.map((e) =>
          e.id === id ? { ...e, zIndex: Math.max(1, e.zIndex - 1) } : e
        ),
      },
    });
    notifyTemplateChange();
  },

  reorderElements: (fromIndex, toIndex) => {
    const { template, pushHistory } = get();
    pushHistory();

    const sorted = [...template.elements].sort((a, b) => b.zIndex - a.zIndex);
    const [moved] = sorted.splice(fromIndex, 1);
    sorted.splice(toIndex, 0, moved);

    const total = sorted.length;
    const reindexed = sorted.map((el, idx) => ({
      ...el,
      zIndex: total - idx,
    }));

    set({
      template: {
        ...template,
        elements: reindexed,
      },
    });
    notifyTemplateChange();
  },

  setBackgroundImage: (src) => {
    const { template, pushHistory } = get();
    pushHistory();
    set({
      template: {
        ...template,
        background: { type: 'image', src },
      },
    });
    notifyTemplateChange();
  },

  setBackgroundColor: (color) => {
    const { template, pushHistory } = get();
    pushHistory();
    set({
      template: {
        ...template,
        background: { type: 'color', color },
      },
    });
    notifyTemplateChange();
  },

  setBackgroundFit: (fit) => {
    const { template, pushHistory } = get();
    pushHistory();
    set({
      template: {
        ...template,
        background: {
          ...template.background,
          fit,
        },
      },
    });
    notifyTemplateChange();
  },

  setPagePreset: (preset) => {
    const { template, pushHistory } = get();
    pushHistory();
    const info = PAGE_PRESETS[preset];
    if (!info) return;

    set({
      template: {
        ...template,
        dimensions: {
          ...template.dimensions,
          width: info.width,
          height: info.height,
          preset,
        },
      },
    });
    notifyTemplateChange();
  },

  setDimensions: (width, height) => {
    const { template, pushHistory } = get();
    pushHistory();
    set({
      template: {
        ...template,
        dimensions: {
          ...template.dimensions,
          width: Math.max(200, width),
          height: Math.max(200, height),
          preset: 'Custom',
        },
      },
    });
    notifyTemplateChange();
  },

  undo: () => {
    const { history, template } = get();
    if (history.past.length === 0) return;

    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);

    set({
      template: previous,
      history: {
        past: newPast,
        future: [template, ...history.future],
      },
    });
    notifyTemplateChange();
  },

  redo: () => {
    const { history, template } = get();
    if (history.future.length === 0) return;

    const next = history.future[0];
    const newFuture = history.future.slice(1);

    set({
      template: next,
      history: {
        past: [...history.past, template],
        future: newFuture,
      },
    });
    notifyTemplateChange();
  },

  }),
  {
    name: 'prc_certificate_editor_template',
    storage: createJSONStorage(() => indexedDbStorage),
    partialize: (state) => ({
      template: state.template,
    }),
  }
)
);
