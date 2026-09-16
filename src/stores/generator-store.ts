import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BatchRow, GeneratedCertificate, StepRequirementInfo } from '../types/generator';
import type { TemplateConfig } from '../types/template';
import { indexedDbStorage } from '../lib/storage';

export type WorkflowStep = 1 | 2 | 3 | 4 | 5;

/**
 * Calculates dynamic prerequisites and lock-step access permission for any given workflow step
 */
export function getStepRequirementInfo(
  step: WorkflowStep,
  state: {
    template: TemplateConfig;
    batchRows: BatchRow[];
    generatedCertificates: GeneratedCertificate[];
    isTemplateDirty: boolean;
  }
): StepRequirementInfo {
  const { template, batchRows, generatedCertificates, isTemplateDirty } = state;

  switch (step) {
    case 1: {
      const hasText = template.elements.some(
        (e) => e.type === 'static-text' || e.type === 'dynamic-text'
      );
      const hasStamp = template.elements.some((e) => e.type === 'stamp-ttd');
      const prereqs = [
        { id: 'has_text', label: 'Teks Sertifikat Minimal 1', met: hasText },
        { id: 'has_stamp', label: 'Slot Stempel TTE Tersedia', met: hasStamp },
      ];
      return {
        step: 1,
        status: hasText && hasStamp ? 'completed' : 'unlocked',
        prerequisites: prereqs,
        canAccess: true,
      };
    }

    case 2: {
      const hasData = batchRows.length > 0;
      const prereqs = [
        { id: 'has_rows', label: 'Minimal 1 Baris Data Penerima', met: hasData },
      ];
      return {
        step: 2,
        status: hasData ? 'completed' : 'unlocked',
        prerequisites: prereqs,
        canAccess: true,
      };
    }

    case 3: {
      const hasData = batchRows.length > 0;
      const hasCerts = generatedCertificates.length > 0;
      const prereqs = [
        { id: 'has_batch_data', label: 'Data Penerima di Step 2', met: hasData },
      ];

      let status: StepRequirementInfo['status'] = 'locked';
      if (hasCerts) {
        status = isTemplateDirty ? 'stale' : 'completed';
      } else if (hasData) {
        status = 'unlocked';
      }

      return {
        step: 3,
        status,
        prerequisites: prereqs,
        canAccess: hasData,
        blockReason: !hasData
          ? 'Masukkan atau impor data penerima terlebih dahulu di Step 2.'
          : undefined,
      };
    }

    case 4: {
      const hasCerts = generatedCertificates.length > 0;
      const fullySigned =
        hasCerts && generatedCertificates.every((c) => c.status === 'fully-signed');
      const prereqs = [
        { id: 'certs_generated', label: 'Dokumen Base PDF Digenerate di Step 3', met: hasCerts },
      ];

      let status: StepRequirementInfo['status'] = 'locked';
      if (fullySigned) {
        status = isTemplateDirty ? 'stale' : 'completed';
      } else if (hasCerts) {
        status = isTemplateDirty ? 'stale' : 'unlocked';
      }

      return {
        step: 4,
        status,
        prerequisites: prereqs,
        canAccess: hasCerts,
        blockReason: !hasCerts
          ? 'Generate dokumen sertifikat terlebih dahulu di Step 3.'
          : undefined,
      };
    }

    case 5: {
      const hasCerts = generatedCertificates.length > 0;
      const anySigned =
        hasCerts && generatedCertificates.some((c) => c.signedBy.length > 0);
      const prereqs = [
        { id: 'certs_ready', label: 'Dokumen Sertifikat Siap Unduh', met: hasCerts },
      ];

      return {
        step: 5,
        status: hasCerts ? (anySigned ? 'completed' : 'unlocked') : 'locked',
        prerequisites: prereqs,
        canAccess: hasCerts,
        blockReason: !hasCerts
          ? 'Generate dokumen terlebih dahulu sebelum mengunduh di Step 5.'
          : undefined,
      };
    }

    default:
      return { step, status: 'unlocked', prerequisites: [], canAccess: true };
  }
}


interface GeneratorState {
  currentStep: WorkflowStep;
  institutionName: string;
  isKeyManagerOpen: boolean;
  batchRows: BatchRow[];
  generatedCertificates: GeneratedCertificate[];
  selectedCertId: string | null;
  isGenerating: boolean;
  progress: { current: number; total: number };
  activeTab: 'editor' | 'generator' | 'signing' | 'keys';
  isTemplateDirty: boolean;
  generationTimestamp: number | null;

  setStep: (step: WorkflowStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  setInstitutionName: (name: string) => void;
  setIsKeyManagerOpen: (open: boolean) => void;
  setBatchRows: (rows: BatchRow[]) => void;
  setGeneratedCertificates: (certs: GeneratedCertificate[]) => void;
  updateCertificate: (id: string, updates: Partial<GeneratedCertificate>) => void;
  setSelectedCertId: (id: string | null) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setProgress: (current: number, total: number) => void;
  setActiveTab: (tab: 'editor' | 'generator' | 'signing' | 'keys') => void;
  markTemplateDirty: () => void;
  clearTemplateDirty: () => void;
  invalidateGeneratedCertificates: () => void;
  loadSampleBatchRows: () => void;
  clearBatchRows: () => void;
  resetGeneratorData: () => void;
  startNewBatch: (keepTemplate?: boolean) => void;
}

export const DEFAULT_SAMPLE_BATCH_ROWS: BatchRow[] = [
  {
    nama: 'Ahmad Dahlan, S.Kom., M.T.',
    nomor_sertifikat: 'CERT-GWARRA-2026-001',
  },
  {
    nama: 'Siti Aminah, S.Kom.',
    nomor_sertifikat: 'CERT-GWARRA-2026-002',
  },
  {
    nama: 'Budi Santoso, S.T.',
    nomor_sertifikat: 'CERT-GWARRA-2026-003',
  },
];

// Helper functions to safely serialize Uint8Array across JSON storage
function uint8ToBase64(bytes: Uint8Array): string {
  if (!bytes || bytes.byteLength === 0) return '';
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  if (!base64) return new Uint8Array();
  try {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return new Uint8Array();
  }
}

export const useGeneratorStore = create<GeneratorState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      institutionName: 'Universitas Kuvukiland',
      isKeyManagerOpen: false,
      batchRows: [],
      generatedCertificates: [],
      selectedCertId: null,
      isGenerating: false,
      progress: { current: 0, total: 0 },
      activeTab: 'editor',
      isTemplateDirty: false,
      generationTimestamp: null,

      setStep: (step) => {
        const tabMap: Record<WorkflowStep, 'editor' | 'generator' | 'signing' | 'keys'> = {
          1: 'editor',
          2: 'generator',
          3: 'generator',
          4: 'signing',
          5: 'signing',
        };
        set({ currentStep: step, activeTab: tabMap[step] });
      },

      nextStep: () => {
        const next = Math.min(5, get().currentStep + 1) as WorkflowStep;
        get().setStep(next);
      },

      prevStep: () => {
        const prev = Math.max(1, get().currentStep - 1) as WorkflowStep;
        get().setStep(prev);
      },

      setInstitutionName: (name) => set({ institutionName: name }),

      setIsKeyManagerOpen: (open) => set({ isKeyManagerOpen: open }),

      setBatchRows: (rows) => {
        const hasExistingCerts = get().generatedCertificates.length > 0;
        set({
          batchRows: rows,
          isTemplateDirty: hasExistingCerts ? true : get().isTemplateDirty,
        });
      },

      setGeneratedCertificates: (certs) =>
        set({
          generatedCertificates: certs,
          selectedCertId: certs.length > 0 ? certs[0].id : null,
          isTemplateDirty: false,
          generationTimestamp: Date.now(),
        }),

      updateCertificate: (id, updates) =>
        set((state) => ({
          generatedCertificates: state.generatedCertificates.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      setSelectedCertId: (id) => set({ selectedCertId: id }),

      setIsGenerating: (isGenerating) => set({ isGenerating }),

      setProgress: (current, total) => set({ progress: { current, total } }),

      markTemplateDirty: () => {
        if (get().generatedCertificates.length > 0) {
          set({ isTemplateDirty: true });
        }
      },

      clearTemplateDirty: () => set({ isTemplateDirty: false }),

      invalidateGeneratedCertificates: () =>
        set({
          generatedCertificates: [],
          selectedCertId: null,
          isTemplateDirty: false,
        }),

      setActiveTab: (tab) => {
        const stepMap: Record<'editor' | 'generator' | 'signing' | 'keys', WorkflowStep> = {
          editor: 1,
          generator: 2,
          signing: 4,
          keys: 1,
        };
        if (tab === 'keys') {
          set({ activeTab: tab, isKeyManagerOpen: true });
        } else {
          set({ activeTab: tab, currentStep: stepMap[tab] });
        }
      },

      loadSampleBatchRows: () =>
        set({
          batchRows: DEFAULT_SAMPLE_BATCH_ROWS,
          generatedCertificates: [],
          isTemplateDirty: true,
        }),

      clearBatchRows: () =>
        set({
          batchRows: [],
          generatedCertificates: [],
          isTemplateDirty: true,
        }),

      resetGeneratorData: () =>
        set({
          currentStep: 1,
          batchRows: [],
          generatedCertificates: [],
          selectedCertId: null,
          isGenerating: false,
          progress: { current: 0, total: 0 },
          activeTab: 'editor',
          isTemplateDirty: false,
          generationTimestamp: null,
          isKeyManagerOpen: false,
        }),

      startNewBatch: (keepTemplate = true) => {
        if (!keepTemplate) {
          get().resetGeneratorData();
        } else {
          set({
            currentStep: 2,
            activeTab: 'generator',
            batchRows: [],
            generatedCertificates: [],
            selectedCertId: null,
            isGenerating: false,
            progress: { current: 0, total: 0 },
            isTemplateDirty: false,
            generationTimestamp: null,
          });
        }
      },
    }),
    {
      name: 'prc_certificate_generator_data',
      storage: createJSONStorage(() => indexedDbStorage),
      partialize: (state) => ({
        currentStep: state.currentStep,
        institutionName: state.institutionName,
        batchRows: state.batchRows,
        generatedCertificates: state.generatedCertificates.map((c) => ({
          ...c,
          basePdfBytesBase64: uint8ToBase64(c.basePdfBytes),
          currentPdfBytesBase64: uint8ToBase64(c.currentPdfBytes),
          // Don't directly store raw uint8array in json
          basePdfBytes: [],
          currentPdfBytes: [],
        })),
      }),
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.generatedCertificates)) {
          // Rehydrate base64 back into Uint8Array
          state.generatedCertificates = state.generatedCertificates.map((c: any) => ({
            ...c,
            basePdfBytes: c.basePdfBytesBase64
              ? base64ToUint8(c.basePdfBytesBase64)
              : new Uint8Array(c.basePdfBytes || []),
            currentPdfBytes: c.currentPdfBytesBase64
              ? base64ToUint8(c.currentPdfBytesBase64)
              : new Uint8Array(c.currentPdfBytes || []),
          }));
        }
      },
    }
  )
);
