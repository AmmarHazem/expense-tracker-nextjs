"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type DesignTheme = "brutalist" | "ios";

const DesignThemeContext = createContext<{
  designTheme: DesignTheme;
  setDesignTheme: (theme: DesignTheme) => void;
}>({
  designTheme: "brutalist",
  setDesignTheme: () => {},
});

export function DesignThemeProvider({ children }: { children: React.ReactNode }) {
  const [designTheme, setDesignThemeState] = useState<DesignTheme>("brutalist");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("design-theme") as DesignTheme | null;
    const resolved = stored === "ios" || stored === "brutalist" ? stored : "brutalist";
    setDesignThemeState(resolved);
    document.documentElement.setAttribute("data-design-theme", resolved);
    setMounted(true);
  }, []);

  const setDesignTheme = (theme: DesignTheme) => {
    setDesignThemeState(theme);
    localStorage.setItem("design-theme", theme);
    document.documentElement.setAttribute("data-design-theme", theme);
  };

  return (
    <DesignThemeContext.Provider value={{ designTheme: mounted ? designTheme : "brutalist", setDesignTheme }}>
      {children}
    </DesignThemeContext.Provider>
  );
}

export function useDesignTheme() {
  return useContext(DesignThemeContext);
}
