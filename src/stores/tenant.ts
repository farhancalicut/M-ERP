import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TenantState {
  madrassaId: string | null;
  setMadrassaId: (id: string | null) => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      madrassaId: null,
      setMadrassaId: (madrassaId) => set({ madrassaId }),
    }),
    {
      name: 'tenant-storage',
    }
  )
);
