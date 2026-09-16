import localforage from 'localforage';
import type { StateStorage } from 'zustand/middleware';

// Initialize dedicated localforage instance for IndexedDB storage
export const appStorage = localforage.createInstance({
  name: 'prc-certificate-generator',
  storeName: 'app_data',
  description: 'IndexedDB persistent storage for PRC Certificate Generator (Templates, Batch Data, & Certificates)',
});

export const indexedDbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const value = await appStorage.getItem<string>(name);
      return value ?? null;
    } catch (err) {
      console.error(`[IndexedDB] Error reading key "${name}":`, err);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await appStorage.setItem(name, value);
    } catch (err) {
      console.error(`[IndexedDB] Error writing key "${name}":`, err);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await appStorage.removeItem(name);
    } catch (err) {
      console.error(`[IndexedDB] Error removing key "${name}":`, err);
    }
  },
};

/**
 * Clear all persistent app data from IndexedDB and reset to initial defaults
 */
export async function clearAllAppData(): Promise<void> {
  try {
    await appStorage.clear();
    // Clear only workflow & template cache, KEEP PKI KEYS INTACT
    localStorage.removeItem('prc_certificate_editor_template');
    localStorage.removeItem('prc_certificate_generator_data');
  } catch (err) {
    console.error('[IndexedDB] Error clearing app data:', err);
  }
}
