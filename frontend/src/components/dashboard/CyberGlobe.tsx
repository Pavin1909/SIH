import { SystemStatus } from "../ui/StatusIndicator";

export interface CyberGlobeProps {
  status?: SystemStatus;
  statusLabel?: string;
  className?: string;
}

export function CyberGlobe({
  status = "online",
  statusLabel = "Atelier Online",
  className = "",
}: CyberGlobeProps) {
  const isOnline = status === "online";

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden select-none pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {/* Soft warm antique amber/plum background aura */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-64 w-64 rounded-full bg-[#c8a96e]/08 blur-3xl" />
        <div className="h-48 w-48 rounded-full bg-[#3d2752]/20 blur-2xl" />
      </div>

      {/* Engraved Intelligence Atlas SVG (Vintage Cartographic Armillary Sphere) */}
      <svg
        viewBox="0 0 400 400"
        className="relative z-10 h-72 w-72 sm:h-80 sm:w-80 md:h-96 md:w-96 text-[#c8a96e] opacity-90 transition-transform duration-700"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="atlasSphere" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#251b36" stopOpacity="0.85" />
            <stop offset="70%" stopColor="#191225" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#120c1c" stopOpacity="0.98" />
          </radialGradient>

          <linearGradient id="brassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dfc28d" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#c8a96e" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#a37e44" stopOpacity="0.9" />
          </linearGradient>

          <filter id="parchmentShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Engraved Brass Meridian Ring */}
        <circle
          cx="200"
          cy="200"
          r="160"
          stroke="#c8a96e"
          strokeWidth="1.5"
          strokeOpacity="0.3"
        />
        <circle
          cx="200"
          cy="200"
          r="154"
          stroke="#dfc28d"
          strokeWidth="0.8"
          strokeDasharray="2 4"
          strokeOpacity="0.45"
        />

        {/* Cardinal Markers on Meridian */}
        <text x="200" y="32" fill="#dfc28d" fontSize="9" fontFamily="Cinzel, Georgia, serif" textAnchor="middle" opacity="0.7">N</text>
        <text x="200" y="378" fill="#dfc28d" fontSize="9" fontFamily="Cinzel, Georgia, serif" textAnchor="middle" opacity="0.7">S</text>
        <text x="32" y="203" fill="#dfc28d" fontSize="9" fontFamily="Cinzel, Georgia, serif" textAnchor="middle" opacity="0.7">W</text>
        <text x="372" y="203" fill="#dfc28d" fontSize="9" fontFamily="Cinzel, Georgia, serif" textAnchor="middle" opacity="0.7">E</text>

        {/* Sphere Base with rich smoky vellum gradient */}
        <circle
          cx="200"
          cy="200"
          r="138"
          fill="url(#atlasSphere)"
          stroke="#c8a96e"
          strokeWidth="1.5"
          strokeOpacity="0.5"
        />

        {/* Equator & Parallels (Engraved Cartographic Ellipses) */}
        <ellipse
          cx="200"
          cy="200"
          rx="138"
          ry="38"
          stroke="#dfc28d"
          strokeWidth="1"
          strokeOpacity="0.4"
          strokeDasharray="3 3"
        />
        <ellipse
          cx="200"
          cy="150"
          rx="122"
          ry="28"
          stroke="#c8a96e"
          strokeWidth="0.8"
          strokeOpacity="0.3"
        />
        <ellipse
          cx="200"
          cy="250"
          rx="122"
          ry="28"
          stroke="#c8a96e"
          strokeWidth="0.8"
          strokeOpacity="0.3"
        />

        {/* Meridians (Vertical Ellipses) */}
        <ellipse
          cx="200"
          cy="200"
          rx="38"
          ry="138"
          stroke="#c8a96e"
          strokeWidth="1"
          strokeOpacity="0.4"
        />
        <ellipse
          cx="200"
          cy="200"
          rx="88"
          ry="138"
          stroke="#c8a96e"
          strokeWidth="0.8"
          strokeOpacity="0.25"
          strokeDasharray="2 4"
        />

        {/* Prime Axis Line */}
        <line
          x1="200"
          y1="62"
          x2="200"
          y2="338"
          stroke="#dfc28d"
          strokeWidth="1"
          strokeOpacity="0.35"
        />
        <line
          x1="62"
          y1="200"
          x2="338"
          y2="200"
          stroke="#dfc28d"
          strokeWidth="1"
          strokeOpacity="0.35"
        />

        {/* Astrolabe / Celestial Coordinates Orbit */}
        <g className="animate-[spin_40s_linear_infinite]" style={{ transformOrigin: "200px 200px" }}>
          <ellipse
            cx="200"
            cy="200"
            rx="148"
            ry="68"
            stroke="url(#brassGrad)"
            strokeWidth="1.2"
            strokeDasharray="6 8 2 8"
            strokeOpacity="0.65"
            transform="rotate(-25 200 200)"
          />
          {/* Celestial node pins */}
          <circle cx="340" cy="150" r="3.5" fill="#dfc28d" stroke="#8c2535" strokeWidth="1" />
          <circle cx="60" cy="250" r="2.5" fill="#dfc28d" stroke="#161122" strokeWidth="1" />
        </g>

        {/* Constellation / Astrolabe Flourish */}
        <circle cx="200" cy="200" r="4" fill="#dfc28d" />
        <circle cx="200" cy="200" r="9" stroke="#dfc28d" strokeWidth="0.8" strokeOpacity="0.5" strokeDasharray="2 2" />
      </svg>

      {/* Archival Ledger Tag at the Base */}
      <div className="absolute bottom-1 z-20 flex items-center gap-2 rounded border border-[#c8a96e]/30 bg-[#161122]/90 px-3 py-1 font-serif text-[10px] text-[#dfc28d] backdrop-blur-md shadow-md">
        <span>❖</span>
        <span className="font-bold tracking-wider">THREAT ATLAS</span>
        <span className="text-[#a498b2]">•</span>
        <span className="text-[#e8e1d5]">{statusLabel}</span>
      </div>
    </div>
  );
}
