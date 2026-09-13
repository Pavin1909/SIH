import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";
import { Refresh } from "../icons";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      icon,
      className = "",
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "px-2.5 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-5 py-2.5 text-base",
    };

    const variantClasses = {
      primary:
        "bg-cyan-500 text-slate-950 hover:bg-cyan-400 focus:ring-cyan-400/40 focus:ring-offset-soc-950",
      secondary:
        "border border-soc-700 bg-soc-900/80 text-slate-200 hover:border-slate-600 hover:bg-soc-800 hover:text-white focus:ring-slate-500/30 focus:ring-offset-soc-950",
      danger:
        "border border-rose-500/40 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 focus:ring-rose-500/40 focus:ring-offset-soc-950",
      ghost:
        "text-slate-400 hover:bg-soc-800 hover:text-slate-200 focus:ring-slate-500/30 focus:ring-offset-soc-950",
    };

    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {loading ? (
          <Refresh size={14} className="animate-spin text-current" />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export function SecondaryButton(props: ButtonProps) {
  return <Button variant="secondary" {...props} />;
}
