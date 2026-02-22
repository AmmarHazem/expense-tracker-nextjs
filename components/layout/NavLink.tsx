"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

export function NavLink({ href, icon, label, onClick }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 font-bold text-sm transition-all border-2
        ${isActive
          ? "bg-blue-primary text-white border-blue-primary shadow-[3px_3px_0_var(--border)]"
          : "bg-transparent text-foreground border-transparent hover:border-border hover:bg-surface"
        }`}
    >
      <span className="text-lg leading-none">{icon}</span>
      <span className="label-mono">{label}</span>
    </Link>
  );
}
