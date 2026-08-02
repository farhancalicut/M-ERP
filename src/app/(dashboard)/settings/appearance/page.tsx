"use client";

import { useTheme } from "next-themes";
import { useThemeStore } from "@/stores/themeStore";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { colorTheme, setColorTheme, fontFamily, setFontFamily, interfaceScale, setInterfaceScale, resetAppearance } = useThemeStore();

  const handleResetAppearance = () => {
    resetAppearance();
    setTheme("system");
    toast.success("Appearance settings reset to default");
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Theme Preferences</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Customize your local viewing experience.</p>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Theme Selector */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-wide">Theme</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { id: 'teal', mode: 'light', name: 'Light Teal', bg: 'bg-white dark:bg-slate-900', primary: 'bg-teal-600' },
                { id: 'blue', mode: 'light', name: 'Light Blue', bg: 'bg-white dark:bg-slate-900', primary: 'bg-blue-600' },
                { id: 'rose', mode: 'light', name: 'Light Rose', bg: 'bg-white dark:bg-slate-900', primary: 'bg-rose-600' },
                { id: 'teal', mode: 'dark', name: 'Dark Teal', bg: 'bg-slate-950', primary: 'bg-teal-500' },
                { id: 'blue', mode: 'dark', name: 'Dark Blue', bg: 'bg-slate-950', primary: 'bg-blue-500' },
                { id: 'rose', mode: 'dark', name: 'Dark Rose', bg: 'bg-slate-950', primary: 'bg-rose-500' },
              ].map(t => {
                const isSelected = colorTheme === t.id && theme === t.mode;
                return (
                  <button
                    key={`${t.mode}-${t.id}`}
                    onClick={() => {
                      setColorTheme(t.id as any);
                      setTheme(t.mode);
                    }}
                    className={`flex flex-col overflow-hidden rounded-xl border-2 transition-all text-left ${isSelected ? 'border-primary ring-2 ring-primary/20 ring-offset-1' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'}`}
                  >
                    <div className={`h-24 w-full ${t.bg} p-3 flex flex-col gap-2 relative border-b border-slate-100 dark:border-slate-800`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${t.primary}`}></div>
                        <div className="h-2 w-12 rounded bg-slate-200 dark:bg-slate-800"></div>
                      </div>
                      <div className={`h-8 w-full rounded ${t.primary} opacity-20`}></div>
                      <div className="h-4 w-2/3 rounded bg-slate-100 dark:bg-slate-800"></div>

                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                          <div className="bg-primary text-primary-foreground rounded-full p-1 shadow-md">
                            <Check className="w-5 h-5" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 w-full">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block text-center">{t.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-[1px] bg-slate-100 dark:bg-slate-800"></div>

          {/* Typography */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 uppercase tracking-wide">Typography</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 'inter', name: 'Inter (Sans)' },
                { id: 'roboto', name: 'Roboto' },
                { id: 'outfit', name: 'Outfit (Modern)' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFontFamily(f.id as any)}
                  className={`p-4 text-left border rounded-xl transition-all ${fontFamily === f.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600 dark:bg-slate-900'}`}
                >
                  <span className="block font-bold text-slate-800 dark:text-slate-200 mb-1">{f.name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">The quick brown fox jumps over the lazy dog.</span>
                </button>
              ))}
            </div>
          </div>

          <div className="h-[1px] bg-slate-100 dark:bg-slate-800"></div>

          {/* Interface Scale Slider */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wide m-0">Interface Scale</h3>
              <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-md uppercase tracking-wider">{interfaceScale}%</span>
            </div>

            <div className="px-2 max-w-md">
              <input
                type="range"
                min="80"
                max="150"
                step="10"
                value={interfaceScale}
                onChange={(e) => setInterfaceScale(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-3 font-medium">
                <span className="text-left w-16">80%</span>
                <span className="text-center w-16">100%</span>
                <span className="text-right w-16">150%</span>
              </div>
            </div>
          </div>

          {/* Reset Default Button */}
          <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" onClick={handleResetAppearance} className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800">
              <RotateCcw className="w-4 h-4 mr-2" />
              Revert to Default
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
