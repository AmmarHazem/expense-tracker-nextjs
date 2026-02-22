"use client";

import { useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { ThemeSelector } from "./ThemeSelector";

export function TopBar({
  sidebarContent,
}: {
  sidebarContent: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-background border-b-2 border-border sticky top-0 z-30">
        <div>
          <div className="label-mono text-foreground/40 text-[0.6rem]">EXPENSE</div>
          <div className="text-lg font-black text-foreground leading-none">TRACKER</div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSelector />
          <ThemeToggle />
          <button
            onClick={() => setOpen(true)}
            className="brutalist-btn w-9 h-9 flex items-center justify-center bg-surface text-foreground"
            aria-label="Open menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
