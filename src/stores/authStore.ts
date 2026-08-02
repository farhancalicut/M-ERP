import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User } from "firebase/auth";
import { User as UserSchema } from "@/types/schema";

interface AuthState {
  user: User | null;
  userData: UserSchema | null;
  madrassa: import("@/types/schema").Madrassa | null;
  currentAcademicYear: { id: string; name: string } | null;
  isInitialized: boolean;
  setUser: (user: User | null, userData?: UserSchema | null, currentAcademicYear?: { id: string; name: string } | null, madrassa?: import("@/types/schema").Madrassa | null) => void;
  setUserData: (userData: UserSchema) => void;
  setMadrassa: (madrassa: import("@/types/schema").Madrassa) => void;
  setCurrentAcademicYear: (year: { id: string; name: string } | null) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      userData: null,
      madrassa: null,
      currentAcademicYear: null,
      isInitialized: false,
      setUser: (user, userData = null, currentAcademicYear = null, madrassa = null) => set({ user, userData, currentAcademicYear, madrassa, isInitialized: true }),
      setUserData: (userData) => set({ userData }),
      setMadrassa: (madrassa) => set({ madrassa }),
      setCurrentAcademicYear: (year) => set({ currentAcademicYear: year }),
      clearUser: () => set({ user: null, userData: null, currentAcademicYear: null, madrassa: null, isInitialized: true }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ userData: state.userData, currentAcademicYear: state.currentAcademicYear, isInitialized: state.isInitialized }),
    }
  )
);
