import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { FileText, Upload, X } from "../icons";

export interface UploadAreaProps {
  onFileSelected: (file: File | null) => void;
  selectedFile?: File | null;
  accept?: string;
  restrictionsHint?: string;
  disabled?: boolean;
  className?: string;
}

export function UploadArea({
  onFileSelected,
  selectedFile,
  accept = ".eml,message/rfc822",
  restrictionsHint = "Accepts RFC 822 email files (.eml). Max 25MB.",
  disabled = false,
  className = "",
}: UploadAreaProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (disabled) return;
    setIsDragOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0] || null;
    if (file) onFileSelected(file);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    onFileSelected(file);
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  return (
    <div className={`w-full ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={handleChange}
        className="hidden"
      />

      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition ${
            isDragOver
              ? "border-cyan-500 bg-cyan-500/5 text-cyan-200"
              : "border-soc-700 bg-soc-950/60 hover:border-slate-600 hover:bg-soc-900/60"
          } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-soc-700 bg-soc-900 text-cyan-400">
            <Upload size={22} />
          </div>
          <p className="mt-3 text-sm font-medium text-slate-200">
            <span className="text-cyan-400 underline decoration-cyan-500/50 underline-offset-4">
              Click to browse
            </span>{" "}
            or drag and drop message file
          </p>
          {restrictionsHint && (
            <p className="mt-1.5 text-xs text-slate-500">{restrictionsHint}</p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-soc-700 bg-soc-900/80 p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-100">
                {selectedFile.name}
              </p>
              <p className="text-xs text-slate-400">
                {formatBytes(selectedFile.size)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-soc-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-soc-800 hover:text-white"
            >
              Change
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onFileSelected(null)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-soc-700 text-slate-400 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-300"
              title="Remove file"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
