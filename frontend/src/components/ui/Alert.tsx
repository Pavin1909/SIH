import { ReactNode } from "react";
import { AlertTriangle, CheckCircle, Shield, X, XCircle } from "../icons";

export type AlertType = "info" | "success" | "warning" | "error";

export interface AlertProps {
  type?: AlertType;
  title?: string;
  message?: ReactNode;
  children?: ReactNode;
  onClose?: () => void;
  className?: string;
}

export function Alert({
  type = "info",
  title,
  message,
  children,
  onClose,
  className = "",
}: AlertProps) {
  const configs = {
    info: {
      border: "border-cyan-500/30",
      bg: "bg-cyan-950/25",
      text: "text-cyan-200",
      titleColor: "text-cyan-300",
      icon: <Shield size={18} className="text-cyan-400" />,
    },
    success: {
      border: "border-emerald-500/30",
      bg: "bg-emerald-950/25",
      text: "text-emerald-200",
      titleColor: "text-emerald-300",
      icon: <CheckCircle size={18} className="text-emerald-400" />,
    },
    warning: {
      border: "border-amber-500/30",
      bg: "bg-amber-950/25",
      text: "text-amber-200",
      titleColor: "text-amber-300",
      icon: <AlertTriangle size={18} className="text-amber-400" />,
    },
    error: {
      border: "border-rose-500/30",
      bg: "bg-rose-950/25",
      text: "text-rose-200",
      titleColor: "text-rose-300",
      icon: <XCircle size={18} className="text-rose-400" />,
    },
  };

  const config = configs[type];

  return (
    <div
      role="alert"
      className={`relative flex items-start gap-3 rounded-xl border p-4 text-sm ${config.bg} ${config.border} ${config.text} ${className}`}
    >
      <div className="shrink-0 mt-0.5">{config.icon}</div>
      <div className="min-w-0 flex-1">
        {title && <h4 className={`font-semibold mb-1 ${config.titleColor}`}>{title}</h4>}
        {message && <div>{message}</div>}
        {children}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          title="Dismiss alert"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
