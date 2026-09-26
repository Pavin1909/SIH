import { ReactNode, useState } from "react";
import { Check, Copy } from "../icons";

export interface EvidenceExhibitRowProps {
  exhibitLetter: string;
  title: string;
  value?: ReactNode;
  isMonospace?: boolean;
  copyable?: boolean;
  status?: ReactNode;
  action?: ReactNode;
  description?: string;
  details?: ReactNode;
  className?: string;
}

export function EvidenceExhibitRow({
  exhibitLetter,
  title,
  value,
  isMonospace = true,
  copyable = false,
  status,
  action,
  description,
  details,
  className = "",
}: EvidenceExhibitRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof value === "string") {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`group relative rounded-lg border border-[#c8a96e]/20 bg-[#140e1f]/70 p-4 transition-all hover:border-[#c8a96e]/40 hover:bg-[#181126] ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Exhibit Label & Title */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[#c8a96e]/40 bg-[#251b33] font-serif text-xs font-bold text-[#dfc28d]">
            {exhibitLetter}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-serif text-[11px] font-bold tracking-wider text-[#dfc28d] uppercase">
                {title}
              </span>
            </div>
            {value && (
              <div className="flex items-center gap-2">
                <div
                  className={`text-xs text-[#e8e1d5] break-all ${
                    isMonospace ? "font-mono text-[11px] text-[#f0e6d6]" : ""
                  }`}
                >
                  {value}
                </div>
                {copyable && typeof value === "string" && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="shrink-0 text-[#a498b2] hover:text-[#dfc28d] transition-colors p-1"
                    title="Copy value"
                  >
                    {copied ? <Check size={13} className="text-[#a8e6cf]" /> : <Copy size={13} />}
                  </button>
                )}
              </div>
            )}
            {description && (
              <p className="text-xs text-[#a498b2] leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right Status / Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {status}
          {action}
        </div>
      </div>

      {/* Optional Expanded Details */}
      {details && (
        <div className="mt-3 pt-3 border-t border-[#c8a96e]/10 text-xs text-[#a498b2]">
          {details}
        </div>
      )}
    </div>
  );
}
