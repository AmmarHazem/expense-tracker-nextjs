import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    const base =
      "brutalist-btn inline-flex items-center justify-center gap-2 font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
      primary: "bg-blue-primary text-white hover:bg-blue-hover",
      secondary: "bg-surface text-foreground hover:bg-background",
      ghost:
        "border-transparent shadow-none hover:shadow-none bg-transparent text-foreground hover:bg-surface",
      danger: "bg-red-500 text-white hover:bg-red-600",
    };

    const sizes = {
      sm: "text-xs px-3 py-1.5 uppercase tracking-wider",
      md: "text-sm px-4 py-2.5 uppercase tracking-wider",
      lg: "text-sm px-6 py-3.5 uppercase tracking-wider",
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
