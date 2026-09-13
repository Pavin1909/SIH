import { forwardRef, InputHTMLAttributes, ReactNode } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, error, hint, className = "", id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="pointer-events-none absolute left-3 flex items-center text-slate-500">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full rounded-lg border bg-soc-950/90 py-2 text-sm text-slate-100 placeholder-slate-500 transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              icon ? "pl-9 pr-3.5" : "px-3.5"
            } ${
              error
                ? "border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20"
                : "border-soc-700 focus:border-cyan-500/80 focus:ring-cyan-500/20"
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
