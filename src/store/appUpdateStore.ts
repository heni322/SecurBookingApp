import { create } from 'zustand';

/**
 * Set when the API reports that this build is below the minimum supported
 * version (426 APP_UPDATE_REQUIRED, audit 2026-10-02 H9). While set, App
 * renders the blocking update screen instead of the navigator.
 */
export interface UpdateRequirement {
  minVersion: string;
  storeUrl: string | null;
}

interface AppUpdateState {
  required: UpdateRequirement | null;
  setRequired: (requirement: UpdateRequirement) => void;
}

export const useAppUpdateStore = create<AppUpdateState>((set) => ({
  required: null,
  setRequired: (requirement) => set({ required: requirement }),
}));
