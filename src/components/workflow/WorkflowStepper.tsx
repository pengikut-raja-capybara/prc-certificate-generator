import React, { useState } from 'react';
import { useGeneratorStore, getStepRequirementInfo, type WorkflowStep } from '../../stores/generator-store';
import { useEditorStore } from '../../stores/editor-store';
import {
  Palette,
  FileSpreadsheet,
  FileCheck2,
  FileSignature,
  Download,
  KeyRound,
  Check,
  ChevronRight,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  Lock,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { clearAllAppData } from '../../lib/storage';
import { showConfirmDialog, showSuccessToast, showBatchResetOptionsDialog } from '../../lib/alerts';

interface WorkflowStepperProps {}

interface StepItem {
  id: WorkflowStep;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const STEPS: StepItem[] = [
  {
    id: 1,
    label: '1. Set Up Template',
    sublabel: 'Layout & Variabel',
    icon: Palette,
  },
  {
    id: 2,
    label: '2. Input Data',
    sublabel: 'Tabel & Signer',
    icon: FileSpreadsheet,
  },
  {
    id: 3,
    label: '3. Generate',
    sublabel: 'Kompilasi PDF',
    icon: FileCheck2,
  },
  {
    id: 4,
    label: '4. Signing',
    sublabel: 'Tanda Tangan PAdES',
    icon: FileSignature,
  },
  {
    id: 5,
    label: '5. Download',
    sublabel: 'Ekspor & Unduh',
    icon: Download,
  },
];

export const WorkflowStepper: React.FC<WorkflowStepperProps> = () => {
  const {
    currentStep,
    setStep,
    nextStep,
    prevStep,
    isKeyManagerOpen,
    setIsKeyManagerOpen,
    batchRows,
    generatedCertificates,
    isTemplateDirty,
    resetGeneratorData,
    startNewBatch,
  } = useGeneratorStore();
  const { template, resetTemplate } = useEditorStore();
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  // Compute live step requirements & lock statuses
  const stepReqs: Record<WorkflowStep, ReturnType<typeof getStepRequirementInfo>> = {
    1: getStepRequirementInfo(1, { template, batchRows, generatedCertificates, isTemplateDirty }),
    2: getStepRequirementInfo(2, { template, batchRows, generatedCertificates, isTemplateDirty }),
    3: getStepRequirementInfo(3, { template, batchRows, generatedCertificates, isTemplateDirty }),
    4: getStepRequirementInfo(4, { template, batchRows, generatedCertificates, isTemplateDirty }),
    5: getStepRequirementInfo(5, { template, batchRows, generatedCertificates, isTemplateDirty }),
  };

  const handleStepClick = (stepId: WorkflowStep) => {
    setIsKeyManagerOpen(false);
    const targetReq = stepReqs[stepId];

    if (!targetReq.canAccess) {
      setWarningMsg(`Langkah ${stepId} Terkunci: ${targetReq.blockReason || 'Selesaikan prasyarat langkah sebelumnya.'}`);
      return;
    }

    if (stepId <= 2 && generatedCertificates.length > 0 && !isTemplateDirty) {
      setWarningMsg('Informasi: Jika Anda mengubah template atau data, dokumen sertifikat harus digenerate ulang.');
    } else {
      setWarningMsg(null);
    }

    setStep(stepId);
  };

  const handleResetAll = async () => {
    const confirmed = await showConfirmDialog(
      'Reset Alur Kerja (Workflow)?',
      'Data baris peserta (Step 2), dokumen sertifikat yang digenerate (Step 3 & 4), dan template akan dikembalikan ke status awal. Kunci & sertifikat di PKI Hub TETAP AMAN dan tidak terhapus.',
      'Ya, Reset Alur Kerja'
    );
    if (confirmed) {
      await clearAllAppData();
      resetGeneratorData();
      resetTemplate();
      setIsKeyManagerOpen(false);
      setStep(1);
      setWarningMsg(null);
      showSuccessToast('Alur kerja berhasil di-reset ke Langkah 1');
    }
  };

  const handleNewBatch = async () => {
    const choice = await showBatchResetOptionsDialog();
    if (!choice) return;

    if (choice === 'keep_template') {
      startNewBatch(true);
      setWarningMsg(null);
      showSuccessToast('Batch baru dimulai: Data peserta & sertifikat di-reset. Template tetap dipertahankan.');
    } else if (choice === 'reset_all') {
      await clearAllAppData();
      resetGeneratorData();
      resetTemplate();
      setIsKeyManagerOpen(false);
      setStep(1);
      setWarningMsg(null);
      showSuccessToast('Alur kerja berhasil di-reset penuh ke Step 1.');
    }
  };

  const getNextStepInfo = () => {
    const nextStepId = (currentStep + 1) as WorkflowStep;
    if (currentStep >= 5) {
      return {
        label: 'Batch Baru',
        disabled: false,
        tooltip: 'Mulai buat batch sertifikat baru',
      };
    }

    const nextReq = stepReqs[nextStepId];
    return {
      label: `Ke ${STEPS.find((s) => s.id === nextStepId)?.label.split('.')[1] || 'Lanjut'}`,
      disabled: !nextReq?.canAccess,
      tooltip: !nextReq?.canAccess
        ? `Langkah ${nextStepId} Terkunci: ${nextReq?.blockReason}`
        : `Lanjut ke ${STEPS.find((s) => s.id === nextStepId)?.label}`,
    };
  };

  const nextInfo = getNextStepInfo();


  return (
    <>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.35rem 1rem',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          gap: '0.75rem',
          zIndex: 50,
          flexWrap: 'nowrap',
          overflowX: 'auto',
          minHeight: '46px',
          maxHeight: '46px',
          height: '46px',
          flexShrink: 0,
        }}
      >
        {/* Brand Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '220px', flexShrink: 0 }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
            }}
          >
            <FileSignature size={15} color="#ffffff" />
          </div>
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.85rem',
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
              }}
            >
              PRC Certificate Generator
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              Visual Template • Batch Data • PAdES Signer
            </div>
          </div>
        </div>

        {/* Guided Stepper Tabs */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.2rem',
            background: 'var(--bg-base)',
            padding: '0.2rem 0.35rem',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            overflowX: 'auto',
            flexShrink: 0,
          }}
        >
          {STEPS.map((step, idx) => {
            const isActive = currentStep === step.id && !isKeyManagerOpen;
            const req = stepReqs[step.id];
            const isLocked = !req.canAccess || req.status === 'locked';
            const isCompleted = req.status === 'completed';
            const isStale = req.status === 'stale';
            const IconComponent = step.icon;

            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => handleStepClick(step.id)}
                  disabled={isLocked}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '5px',
                    border: 'none',
                    background: isActive
                      ? 'var(--primary-color, #6366f1)'
                      : isStale
                      ? 'rgba(245, 158, 11, 0.15)'
                      : isCompleted
                      ? 'rgba(16, 185, 129, 0.1)'
                      : 'transparent',
                    color: isActive
                      ? '#ffffff'
                      : isStale
                      ? '#f59e0b'
                      : isCompleted
                      ? '#10b981'
                      : isLocked
                      ? 'var(--text-muted)'
                      : 'var(--text-secondary)',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    opacity: isLocked ? 0.45 : 1,
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.72rem',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    textAlign: 'left',
                  }}
                  title={
                    isLocked
                      ? `Terkunci: ${req.blockReason || 'Selesaikan langkah sebelumnya'}`
                      : isStale
                      ? 'Perlu digenerate ulang karena ada perubahan template/data'
                      : step.sublabel
                  }
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isActive
                        ? 'rgba(255,255,255,0.25)'
                        : isStale
                        ? '#f59e0b'
                        : isCompleted
                        ? '#10b981'
                        : isLocked
                        ? 'rgba(148, 163, 184, 0.15)'
                        : 'var(--border-subtle)',
                      color: isCompleted || isStale ? '#ffffff' : 'inherit',
                      fontSize: '0.6rem',
                      flexShrink: 0,
                    }}
                  >
                    {isLocked ? (
                      <Lock size={9} />
                    ) : isStale ? (
                      <AlertTriangle size={9} />
                    ) : isCompleted ? (
                      <Check size={10} strokeWidth={3} />
                    ) : (
                      <IconComponent size={10} />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ lineHeight: 1.2 }}>{step.label}</span>
                      {isLocked && <Lock size={9} style={{ opacity: 0.5 }} />}
                      {isStale && (
                        <span
                          style={{
                            fontSize: '0.52rem',
                            background: '#f59e0b',
                            color: '#ffffff',
                            padding: '0.05rem 0.25rem',
                            borderRadius: '3px',
                            fontWeight: 700,
                            lineHeight: 1,
                          }}
                        >
                          STALE
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '0.6rem',
                        opacity: isActive ? 0.9 : 0.65,
                        lineHeight: 1.1,
                      }}
                    >
                      {step.sublabel}
                    </span>
                  </div>
                </button>


                {idx < STEPS.length - 1 && (
                  <ChevronRight
                    size={13}
                    color="var(--text-muted)"
                    style={{ opacity: 0.4, flexShrink: 0 }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Right Controls: Utilities & Step Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          <button
            className="btn btn-outline btn-xs"
            onClick={handleResetAll}
            title="Reset seluruh template dan data ke default"
            style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.45rem' }}
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>

          <button
            className={`btn btn-xs ${isKeyManagerOpen ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setIsKeyManagerOpen(!isKeyManagerOpen)}
            title="Kelola Kunci Kriptografi & Otoritas Sertifikasi (PKI)"
            style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.45rem' }}
          >
            <KeyRound size={12} />
            <span>Keys PKI</span>
          </button>

          <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle)', margin: '0 0.15rem' }} />

          {/* Previous Step Button */}
          {currentStep > 1 && (
            <button
              className="btn btn-secondary btn-xs"
              onClick={() => {
                setIsKeyManagerOpen(false);
                prevStep();
              }}
              title="Kembali ke langkah sebelumnya"
              style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.55rem' }}
            >
              <ArrowLeft size={12} />
              <span>Kembali</span>
            </button>
          )}

          {/* Next Step Button */}
          {currentStep < 5 ? (
            <button
              className="btn btn-primary btn-xs"
              onClick={() => {
                setIsKeyManagerOpen(false);
                const nextStepId = (currentStep + 1) as WorkflowStep;
                const nextReq = stepReqs[nextStepId];
                if (nextReq?.canAccess) {
                  nextStep();
                }
              }}
              disabled={nextInfo.disabled}
              title={nextInfo.tooltip}

              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.65rem',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              }}
            >
              <span>{nextInfo.label}</span>
              <ArrowRight size={12} />
            </button>
          ) : (
            <button
              className="btn btn-primary btn-xs"
              onClick={handleNewBatch}
              title="Mulai buat batch sertifikat baru"
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.65rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              }}
            >
              <RotateCcw size={12} />
              <span>Batch Baru</span>
            </button>
          )}
        </div>
      </header>

      {/* Non-blocking Notice Banner if validation fails */}
      {warningMsg && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.12)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
            padding: '0.35rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: '#fbbf24',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={15} />
            <span>{warningMsg}</span>
          </div>
          <button
            onClick={() => setWarningMsg(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fbbf24',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            Tutup
          </button>
        </div>
      )}
    </>
  );
};
