import { SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = "", id, ...props }, ref) => {
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
        <select
          ref={ref}
          id={id}
          className={`w-full bg-surface border-2 border-border text-foreground px-3 py-2.5 text-sm font-mono
            focus:outline-none focus:ring-2 focus:ring-blue-primary focus:border-blue-primary
            ${error ? "border-red-500" : ""}
            ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-xs text-red-500 font-mono">{error}</p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";
