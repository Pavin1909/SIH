import { verdictTone } from "../../utils";

export interface ClassificationSealProps {
  verdict?: string | null;
  score?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  subtitle?: string;
}

export function ClassificationSeal({
  verdict = "SAFE",
  score,
  size = "md",
  className = "",
  subtitle,
}: ClassificationSealProps) {
  const tone = verdictTone(verdict || "");
  
  // Seal Palette: Muted Sage, Antique Amber, Deep Crimson/Wine
  const styles = {
    safe: {
      outerRing: "border-[#558f70]/50 bg-[#16271e]/70",
      innerMedallion: "border-[#558f70]/80 bg-gradient-to-b from-[#214130] to-[#14261d]",
      goldTrim: "border-[#dfc28d]/40",
      textColor: "text-[#a8e6cf]",
      scoreColor: "text-[#e8f5e9]",
      label: "SAFE",
    },
    suspicious: {
      outerRing: "border-[#e2a554]/50 bg-[#2d2011]/70",
      innerMedallion: "border-[#e2a554]/80 bg-gradient-to-b from-[#422e15] to-[#291c0a]",
      goldTrim: "border-[#dfc28d]/40",
      textColor: "text-[#ffd180]",
      scoreColor: "text-[#fff8e1]",
      label: "SUSPICIOUS",
    },
    malicious: {
      outerRing: "border-[#b4384d]/50 bg-[#2c1218]/70",
      innerMedallion: "border-[#b4384d]/80 bg-gradient-to-b from-[#5c1320] to-[#3a0812]",
      goldTrim: "border-[#dfc28d]/40",
      textColor: "text-[#ff8a9a]",
      scoreColor: "text-[#ffebee]",
      label: "MALICIOUS",
    },
    neutral: {
      outerRing: "border-[#8c7e9c]/40 bg-[#1b1525]/70",
      innerMedallion: "border-[#8c7e9c]/60 bg-gradient-to-b from-[#2a2039] to-[#181223]",
      goldTrim: "border-[#dfc28d]/30",
      textColor: "text-[#d5cbbd]",
      scoreColor: "text-[#e8e1d5]",
      label: verdict?.toUpperCase() || "RECORDED",
    },
  }[tone] || {
    outerRing: "border-[#8c7e9c]/40 bg-[#1b1525]/70",
    innerMedallion: "border-[#8c7e9c]/60 bg-gradient-to-b from-[#2a2039] to-[#181223]",
    goldTrim: "border-[#dfc28d]/30",
    textColor: "text-[#d5cbbd]",
    scoreColor: "text-[#e8e1d5]",
    label: verdict?.toUpperCase() || "RECORDED",
  };

  if (size === "sm") {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-full border ${styles.outerRing} px-3 py-1 font-serif backdrop-blur-md ${className}`}
      >
        <span className="font-serif text-[10px] text-[#dfc28d]">❖</span>
        <span className={`text-xs font-bold tracking-wider ${styles.textColor}`}>
          {styles.label}
        </span>
        {score !== null && score !== undefined && (
          <span className="font-mono text-xs text-[#e8e1d5]/80">
            {score}/100
          </span>
        )}
      </div>
    );
  }

  if (size === "lg") {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        {/* Large Concentric Archival Cameo Seal */}
        <div
          className={`relative flex h-32 w-32 items-center justify-center rounded-full border-2 ${styles.outerRing} p-2 shadow-[0_8px_30px_rgba(0,0,0,0.65)]`}
        >
          {/* Antique Gold Concentric Inset Ring */}
          <div
            className={`flex h-full w-full flex-col items-center justify-center rounded-full border border-dashed ${styles.goldTrim} ${styles.innerMedallion}`}
          >
            {score !== null && score !== undefined ? (
              <>
                <div className={`font-serif text-3xl font-extrabold tracking-tight ${styles.scoreColor}`}>
                  {score}
                </div>
                <div className="font-serif text-[9px] tracking-widest text-[#dfc28d]/80 uppercase">
                  Score / 100
                </div>
              </>
            ) : (
              <div className="font-serif text-2xl text-[#dfc28d]">❖</div>
            )}
          </div>
        </div>

        {/* Seal Classification Ribbon */}
        <div className="mt-3 text-center">
          <div className="font-serif text-[10px] tracking-widest text-[#a498b2] uppercase">
            {subtitle || "Threat Assessment"}
          </div>
          <div className={`mt-0.5 font-serif text-sm font-bold tracking-wider ${styles.textColor}`}>
            {styles.label}
          </div>
        </div>
      </div>
    );
  }

  // Medium (Default)
  return (
    <div
      className={`inline-flex items-center gap-3 rounded-lg border ${styles.outerRing} p-2.5 backdrop-blur-md ${className}`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-full border ${styles.goldTrim} ${styles.innerMedallion}`}
      >
        {score !== null && score !== undefined ? (
          <span className={`font-serif text-xs font-bold ${styles.scoreColor}`}>
            {score}
          </span>
        ) : (
          <span className="font-serif text-xs text-[#dfc28d]">❖</span>
        )}
      </div>
      <div>
        <div className="font-serif text-[10px] tracking-wider text-[#a498b2] uppercase">
          {subtitle || "Classification"}
        </div>
        <div className={`font-serif text-xs font-bold tracking-wide ${styles.textColor}`}>
          {styles.label}
        </div>
      </div>
    </div>
  );
}
