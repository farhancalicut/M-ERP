'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/auth';

/**
 * Root page — acts as the SPA catch-all handler.
 *
 * In static export mode, Firebase Hosting's catch-all rewrite sends ALL unmatched
 * URLs (e.g. /students/abc123) here. We check auth state and then redirect:
 *   - Authenticated: redirect back to the originally intended path
 *   - Not authenticated: redirect to /login
 *
 * This preserves deep-link / refresh behavior for dynamic routes.
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Capture the intended path BEFORE any navigation changes it
    const intendedPath =
      typeof window !== 'undefined' ? window.location.pathname : '/';

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && intendedPath && intendedPath !== '/') {
        // Logged in — send them to where they were trying to go
        router.replace(intendedPath);
      } else {
        // Not logged in — send to login
        router.replace('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Blank while resolving auth
  return null;
}
