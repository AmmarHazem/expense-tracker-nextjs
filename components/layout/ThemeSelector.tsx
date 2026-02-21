"use client";

import { useDesignTheme, type DesignTheme } from "@/components/providers/DesignThemeProvider";
import { useEffect, useState } from "react";

const themes: { value: DesignTheme; label: string; title: string }[] = [
  { value: "brutalist", label: "Brutal", title: "Brutalist theme" },
  { value: "ios", label: "iOS", title: "Apple-inspired theme" },
];

export function ThemeSelector() {
  const { designTheme, setDesignTheme } = useDesignTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-[108px] h-9" />;

  return (
    <div className="flex items-center brutalist-box bg-surface overflow-hidden">
      {themes.map((t) => {
        const active = designTheme === t.value;
        return (
          <button
            key={t.value}
            onClick={() => setDesignTheme(t.value)}
            title={t.title}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              active
                ? "bg-foreground text-background"
                : "text-foreground hover:bg-foreground/10"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
