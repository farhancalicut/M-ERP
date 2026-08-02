import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ColorTheme = 'teal' | 'blue' | 'rose';
export type FontFamily = 'inter' | 'roboto' | 'outfit';

interface ThemeState {
  colorTheme: ColorTheme;
  fontFamily: FontFamily;
  interfaceScale: number;
  setColorTheme: (theme: ColorTheme) => void;
  setFontFamily: (font: FontFamily) => void;
  setInterfaceScale: (scale: number) => void;
  resetAppearance: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      colorTheme: 'teal',
      fontFamily: 'inter',
      interfaceScale: 100,
      setColorTheme: (colorTheme) => set({ colorTheme }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setInterfaceScale: (interfaceScale) => set({ interfaceScale }),
      resetAppearance: () => set({ colorTheme: 'teal', fontFamily: 'inter', interfaceScale: 100 }),
    }),
    {
      name: 'merp-theme-preferences',
    }
  )
);
