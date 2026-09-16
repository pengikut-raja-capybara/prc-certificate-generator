import React, { useEffect } from 'react';
import { useGeneratorStore } from '../../stores/generator-store';
import { useKeysStore } from '../../stores/keys-store';
import { Toolbar } from '../editor/Toolbar';
import { Canvas } from '../editor/Canvas';
import { PropertiesPanel } from '../editor/PropertiesPanel';
import { LayerPanel } from '../editor/LayerPanel';
import { WorkflowStepper } from '../workflow/WorkflowStepper';
import { InputDataStep } from '../workflow/InputDataStep';
import { GenerateStep } from '../workflow/GenerateStep';
import { SigningStep } from '../workflow/SigningStep';
import { DownloadStep } from '../workflow/DownloadStep';
import { KeyManagerView } from '../keys/KeyManagerView';
import { ArrowLeft } from 'lucide-react';

export const AppShell: React.FC = () => {
  const { currentStep, isKeyManagerOpen, setIsKeyManagerOpen } = useGeneratorStore();
  const { initKeys } = useKeysStore();

  // Initialize keys from local storage or defaults on startup
  useEffect(() => {
    initKeys();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Guided Workflow Stepper Header */}
      <WorkflowStepper />

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* If Key Manager modal/view is open */}
        {isKeyManagerOpen ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-base)' }}>
            <div
              style={{
                padding: '0.4rem 1rem',
                background: 'var(--bg-surface)',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>PKI & Cryptography Hub</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Kelola Root CA dan Kunci Sertifikat Digital
                </span>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setIsKeyManagerOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}
              >
                <ArrowLeft size={14} />
                <span>Kembali ke Alur Sertifikat (Langkah {currentStep})</span>
              </button>
            </div>
            <KeyManagerView />
          </div>
        ) : (
          <>
            {/* Step 1: Set Up Template */}
            {currentStep === 1 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', width: '100%', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
                <Toolbar />
                <div style={{ flex: 1, display: 'flex', minWidth: 0, minHeight: 0, overflow: 'hidden', position: 'relative', width: '100%', height: '100%' }}>
                  <LayerPanel />
                  <Canvas />
                  <PropertiesPanel />
                </div>
              </div>
            )}

            {/* Step 2: Input Data & Define Signer */}
            {currentStep === 2 && <InputDataStep />}

            {/* Step 3: Generate Certificate */}
            {currentStep === 3 && <GenerateStep />}

            {/* Step 4: Signing (All Signer Signing) */}
            {currentStep === 4 && <SigningStep />}

            {/* Step 5: Download Sah */}
            {currentStep === 5 && <DownloadStep />}
          </>
        )}
      </main>
    </div>
  );
};
