interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
}

export function Badge({ children, color, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold border-2 border-border font-mono ${className}`}
      style={color ? { backgroundColor: color + "33", borderColor: color } : {}}
    >
      {children}
    </span>
  );
}
