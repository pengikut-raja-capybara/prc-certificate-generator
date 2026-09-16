import { create } from 'zustand';
import type { UserKey, StoredCert, CaCertificateData } from '../types/keys';
import {
  ensureInitializedKeys,
  createNewSigner,
  exportKeyBundle,
  importKeyBundle,
  deleteStoredSigner,
  clearStoredSigners,
  loadDemoSigners as loadDemoSignersLib,
  resetCa as resetCaLib,
} from '../lib/key-manager';

interface KeysState {
  ca: CaCertificateData | null;
  signers: UserKey[];
  certs: Record<string, StoredCert>;
  activeSignerId: string;

  getSignerPassword: (id: string) => string;
  initKeys: () => void;
  setActiveSignerId: (id: string) => void;
  addSigner: (name: string, role: string, org: string, email?: string, p12Password?: string) => void;
  deleteSigner: (id: string) => void;
  clearAllSigners: () => void;
  loadDemoSigners: () => void;
  resetRootCa: (orgName?: string) => void;
  exportBundle: () => string;
  importBundle: (json: string) => boolean;
}

export const useKeysStore = create<KeysState>((set, get) => ({
  ca: null,
  signers: [],
  certs: {},
  activeSignerId: '',

  getSignerPassword: (id: string) => {
    const { certs } = get();
    return certs[id]?.p12Password || 'secret_password_123';
  },

  initKeys: () => {
    const { ca, signers, certs } = ensureInitializedKeys();
    set({
      ca,
      signers,
      certs,
      activeSignerId: signers.length > 0 ? signers[0].id : '',
    });
  },

  setActiveSignerId: (id) => set({ activeSignerId: id }),

  addSigner: (name, role, org, email, p12Password) => {
    try {
      const { signer, cert } = createNewSigner(name, role, org, email, p12Password);
      const { signers, certs } = get();
      set({
        signers: [...signers, signer],
        certs: { ...certs, [signer.id]: cert },
        activeSignerId: signer.id,
      });
    } catch (e) {
      console.error('Failed to add signer:', e);
    }
  },

  deleteSigner: (id) => {
    deleteStoredSigner(id);
    const { signers, certs } = get();
    const filtered = signers.filter((s) => s.id !== id);
    const newCerts = { ...certs };
    delete newCerts[id];
    set({
      signers: filtered,
      certs: newCerts,
      activeSignerId: filtered.length > 0 ? filtered[0].id : '',
    });
  },

  clearAllSigners: () => {
    clearStoredSigners();
    set({
      signers: [],
      certs: {},
      activeSignerId: '',
    });
  },

  loadDemoSigners: () => {
    const { signers, certs } = loadDemoSignersLib();
    set({
      signers,
      certs,
      activeSignerId: signers.length > 0 ? signers[0].id : '',
    });
  },

  resetRootCa: (orgName = 'Universitas Kuvukiland') => {
    const ca = resetCaLib(orgName);
    set({
      ca,
      signers: [],
      certs: {},
      activeSignerId: '',
    });
  },

  exportBundle: () => {
    return exportKeyBundle();
  },

  importBundle: (json) => {
    try {
      importKeyBundle(json);
      get().initKeys();
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  },
}));

