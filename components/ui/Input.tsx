import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="label-mono text-foreground/60 block mb-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`w-full bg-surface border-2 border-border text-foreground px-3 py-2.5 text-sm font-mono
            focus:outline-none focus:ring-2 focus:ring-blue-primary focus:border-blue-primary
            placeholder:text-foreground/30
            ${error ? "border-red-500" : ""}
            ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-red-500 font-mono">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
