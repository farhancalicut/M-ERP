"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/auth";
import { useAuthStore } from "@/stores/authStore";
import { userService } from "@/features/auth/services/userService";
import { academicYearService } from "@/features/academic/services/academicYearService";
import { madrassaService } from "@/features/super-admin/services/madrassaService";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const { setUser, clearUser, userData, isInitialized } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (userData && userData.uid === firebaseUser.uid) {
          setUser(firebaseUser, userData, useAuthStore.getState().currentAcademicYear, useAuthStore.getState().madrassa);
          setLoading(false);
          return;
        }

        try {
          const fetchedUser = await userService.getCurrentUser(firebaseUser.uid);
          
          if (fetchedUser) {
            // Validate status
            const blockedStatuses = ['LOCKED', 'INACTIVE', 'ARCHIVED', 'DELETED'];
            if (blockedStatuses.includes(fetchedUser.status || '')) {
              await signOut(auth);
              clearUser();
            } else {
              let currentYearSettings = null;
              let madrassa = null;
              if (fetchedUser.role !== 'SUPER_ADMIN') {
                currentYearSettings = await academicYearService.getCurrentAcademicYearSettings(fetchedUser.madrassaId);
                madrassa = await madrassaService.getMadrassaById(fetchedUser.madrassaId);

                // Layer 3 Security: Block suspended tenants at login
                if (madrassa?.status === 'SUSPENDED' || fetchedUser.subscriptionStatus === 'LOCKED') {
                  await signOut(auth);
                  clearUser();
                  setLoading(false);
                  return;
                }
              }
              setUser(firebaseUser, fetchedUser, currentYearSettings ? { id: currentYearSettings.id, name: currentYearSettings.name } : null, madrassa);
            }
          } else {
            clearUser();
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          clearUser();
        }
      } else {
        clearUser();
      }
      setLoading(false);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setUser, clearUser]); // Intentionally omitting userData from deps

  if (loading && !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}
