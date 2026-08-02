"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/stores/themeStore";

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { colorTheme, fontFamily, interfaceScale } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", colorTheme);
    root.setAttribute("data-font", fontFamily);
    root.style.fontSize = `calc(14px * (${interfaceScale} / 100))`;
  }, [colorTheme, fontFamily, interfaceScale]);

  return <>{children}</>;
}
