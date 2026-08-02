import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter, Roboto, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeWrapper } from "@/components/theme/ThemeWrapper";
import { Toaster } from "sonner";
import NextTopLoader from 'nextjs-toploader';

const inter = Inter({ 
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: 'swap',
  variable: '--font-inter',
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: 'swap',
  variable: '--font-roboto',
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: 'swap',
  variable: '--font-outfit',
});

const APP_NAME = "M-ERP";
const APP_DEFAULT_TITLE = "M-ERP | Madrassa Management System";
const APP_TITLE_TEMPLATE = "%s - M-ERP";
const APP_DESCRIPTION = "Multi-tenant Madrassa Enterprise Resource Planning PWA.";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${roboto.variable} ${outfit.variable}`}>
      <body className="font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          <Providers>
            <Suspense fallback={null}>
              <NextTopLoader color="hsl(var(--primary))" showSpinner={false} />
            </Suspense>
            <ThemeWrapper>
              {children}
            </ThemeWrapper>
          </Providers>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
