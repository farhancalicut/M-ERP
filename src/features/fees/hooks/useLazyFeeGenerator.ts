import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { feeGeneratorService } from '../services/feeGeneratorService';

export function useLazyFeeGenerator() {
  const { userData, currentAcademicYear } = useAuthStore();
  const hasRun = useRef(false);

  useEffect(() => {
    // Only run for Managers/Principals and only once per session
    if (hasRun.current) return;
    if (!userData?.madrassaId || !currentAcademicYear?.id) return;
    if (userData.role !== 'MANAGEMENT' && userData.role !== 'PRINCIPAL' && userData.role !== 'SUPER_ADMIN') return;

    const generateFees = async () => {
      hasRun.current = true; // Set to true immediately to avoid double-firing in StrictMode
      try {
        await feeGeneratorService.lazyGenerateFees(userData.madrassaId, currentAcademicYear.id);
      } catch (error) {
        console.error("Lazy fee generation encountered an error:", error);
      }
    };

    generateFees();
  }, [userData?.madrassaId, currentAcademicYear?.id, userData?.role]);
}
