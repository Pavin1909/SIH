import { ReactNode, useEffect } from "react";
import { X } from "../icons";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className = "",
  maxWidth = "lg",
}: ModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="fixed inset-0 bg-soc-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div
        className={`relative z-10 w-full overflow-hidden rounded-xl border border-soc-700 bg-soc-900 shadow-2xl transition-all ${maxWidthClasses[maxWidth]} ${className}`}
      >
        <div className="flex items-center justify-between border-b border-soc-700/60 px-6 py-4">
          <div className="text-base font-semibold text-slate-100">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-soc-800 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 text-sm text-slate-300">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-soc-700/60 bg-soc-950/60 px-6 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
