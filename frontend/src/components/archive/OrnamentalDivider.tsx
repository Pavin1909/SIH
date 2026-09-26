export interface OrnamentalDividerProps {
  label?: string;
  className?: string;
  flourish?: boolean;
}

export function OrnamentalDivider({
  label,
  className = "",
  flourish = true,
}: OrnamentalDividerProps) {
  if (label) {
    return (
      <div className={`relative flex items-center justify-center my-6 ${className}`}>
        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#c8a96e]/30 to-transparent" />
        <div className="mx-4 flex items-center gap-2 font-serif text-[11px] font-semibold tracking-widest text-[#dfc28d] uppercase">
          {flourish && <span className="text-[9px] text-[#c8a96e]">❖</span>}
          <span>{label}</span>
          {flourish && <span className="text-[9px] text-[#c8a96e]">❖</span>}
        </div>
        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#c8a96e]/30 to-transparent" />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center my-4 ${className}`}>
      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#c8a96e]/25 to-transparent" />
      {flourish && (
        <span className="mx-3 font-serif text-[10px] text-[#c8a96e]/60 select-none">
          ❖
        </span>
      )}
      <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#c8a96e]/25 to-transparent" />
    </div>
  );
}
