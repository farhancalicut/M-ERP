import { initializeApp, getApps, getApp } from "firebase/app";

const requireEnv = (name: string, value: string | undefined): string => {
  if (!value) {
    // In browser environment, we might just warn, but for strict typing we return an empty string
    // if we don't want to break the build outright if env isn't populated at build time.
    // However, Firebase requires these to be valid strings. 
    console.warn(`Missing environment variable: ${name}`);
    return ""; 
  }
  return value;
};

const firebaseConfig = {
  apiKey: requireEnv("NEXT_PUBLIC_FIREBASE_API_KEY", process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: requireEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: requireEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: requireEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: requireEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: requireEnv("NEXT_PUBLIC_FIREBASE_APP_ID", process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
};

// Singleton initialization
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export default app;
