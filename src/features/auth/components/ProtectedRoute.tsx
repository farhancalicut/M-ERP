"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { LoadingScreen } from "@/components/shared/LoadingScreen";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, userData, madrassa, isInitialized } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isInitialized && !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (isInitialized && user && userData && madrassa) {
      // Layer 4 Security: Redirect suspended tenants
      const isSuspended = madrassa.status === 'SUSPENDED' || userData.subscriptionStatus === 'LOCKED';
      if (isSuspended) {
        router.replace('/suspended');
        return;
      }

      // Self-heal parent accounts missing domainId
      if (userData.role === "PARENT" && !(userData as any).domainId) {
        const healParent = async () => {
          try {
            const { db } = await import("@/lib/firebase/firestore");
            const { collection, query, where, getDocs, updateDoc, doc } = await import("firebase/firestore");
            const parentQuery = query(collection(db, "parents"), where("email", "==", userData.email));
            const parentDocs = await getDocs(parentQuery);
            if (!parentDocs.empty) {
              const parentDoc = parentDocs.docs[0];
              if (!parentDoc || !userData?.id) return;
              await updateDoc(doc(db, "parents", parentDoc.id), { userId: userData.id }).catch(() => {});
              await updateDoc(doc(db, "users", userData.id), { domainId: parentDoc.id }).catch(() => {});
              useAuthStore.getState().setUserData({ ...userData, domainId: parentDoc.id });
            }
          } catch (e) { console.error(e); }
        };
        healParent();
      }

      // Settings Wizard Logic
      const isSetupIncomplete = madrassa.isSetupComplete === false;
      const isManager = userData.role === "MANAGEMENT";
      const isSettingsRoute = pathname.startsWith("/settings");

      if (isManager && isSetupIncomplete && !isSettingsRoute) {
        router.replace("/settings/general");
      }
    }
  }, [user, isInitialized, userData, madrassa, router, pathname]);

  if (!isInitialized || !user) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
