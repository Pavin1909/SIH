import { SystemStatus } from "../ui/StatusIndicator";

export interface CyberGlobeProps {
  status?: SystemStatus;
  statusLabel?: string;
  className?: string;
}

export function CyberGlobe({
  status = "online",
  statusLabel = "Online",
  className = "",
}: CyberGlobeProps) {
  const isOnline = status === "online";

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden select-none pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {/* Ambient background glow for globe */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl animate-pulse" />
        <div className="h-48 w-48 rounded-full bg-blue-600/15 blur-2xl" />
      </div>

      {/* Cyber Digital Globe SVG */}
      <svg
        viewBox="0 0 400 400"
        className="relative z-10 h-72 w-72 sm:h-80 sm:w-80 md:h-96 md:w-96 text-cyan-400 opacity-90 transition-transform duration-700"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="globeSphere" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#081d38" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3" />
          </radialGradient>

          <linearGradient id="orbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#0284c7" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="1" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.3" />
          </linearGradient>

          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Sphere Base with soft radial gradient */}
        <circle
          cx="200"
          cy="200"
          r="140"
          fill="url(#globeSphere)"
          stroke="#06b6d4"
          strokeWidth="1.5"
          strokeOpacity="0.4"
        />

        {/* Outer subtle glow rim */}
        <circle
          cx="200"
          cy="200"
          r="142"
          stroke="#38bdf8"
          strokeWidth="0.8"
          strokeDasharray="4 8"
          strokeOpacity="0.6"
        />

        {/* Latitude Rings (Horizontal Ellipses) */}
        <ellipse
          cx="200"
          cy="200"
          rx="140"
          ry="38"
          stroke="#06b6d4"
          strokeWidth="1"
          strokeOpacity="0.35"
          strokeDasharray="3 3"
        />
        <ellipse
          cx="200"
          cy="150"
          rx="124"
          ry="28"
          stroke="#06b6d4"
          strokeWidth="0.8"
          strokeOpacity="0.25"
        />
        <ellipse
          cx="200"
          cy="250"
          rx="124"
          ry="28"
          stroke="#06b6d4"
          strokeWidth="0.8"
          strokeOpacity="0.25"
        />
        <ellipse
          cx="200"
          cy="105"
          rx="98"
          ry="18"
          stroke="#06b6d4"
          strokeWidth="0.75"
          strokeOpacity="0.2"
          strokeDasharray="2 4"
        />
        <ellipse
          cx="200"
          cy="295"
          rx="98"
          ry="18"
          stroke="#06b6d4"
          strokeWidth="0.75"
          strokeOpacity="0.2"
          strokeDasharray="2 4"
        />

        {/* Longitude Rings (Vertical Ellipses) */}
        <ellipse
          cx="200"
          cy="200"
          rx="45"
          ry="140"
          stroke="#06b6d4"
          strokeWidth="1"
          strokeOpacity="0.35"
        />
        <ellipse
          cx="200"
          cy="200"
          rx="95"
          ry="140"
          stroke="#06b6d4"
          strokeWidth="0.8"
          strokeOpacity="0.25"
        />
        <line
          x1="200"
          y1="60"
          x2="200"
          y2="340"
          stroke="#06b6d4"
          strokeWidth="1"
          strokeOpacity="0.4"
          strokeDasharray="4 4"
        />

        {/* Orbit Trajectory Arc 1 */}
        <path
          d="M 60 210 Q 150 90, 320 120"
          fill="none"
          stroke="url(#orbitGrad)"
          strokeWidth="1.8"
          filter="url(#glow)"
        />
        {/* Orbit Satellite Node 1 */}
        <circle cx="270" cy="113" r="3.5" fill="#38bdf8" filter="url(#glow)" />
        <circle cx="270" cy="113" r="7" stroke="#38bdf8" strokeWidth="0.75" strokeOpacity="0.6" />

        {/* Orbit Trajectory Arc 2 */}
        <path
          d="M 90 280 Q 240 330, 340 220"
          fill="none"
          stroke="url(#orbitGrad)"
          strokeWidth="1.5"
          strokeDasharray="6 4"
        />
        {/* Orbit Satellite Node 2 */}
        <circle cx="160" cy="298" r="3" fill="#06b6d4" filter="url(#glow)" />

        {/* Constellation / Threat Intelligence Grid Nodes */}
        <g opacity="0.85">
          <circle cx="160" cy="170" r="2.5" fill="#38bdf8" />
          <circle cx="230" cy="160" r="2" fill="#06b6d4" />
          <circle cx="260" cy="190" r="3" fill="#22d3ee" filter="url(#glow)" />
          <circle cx="180" cy="220" r="2.5" fill="#38bdf8" />
          <circle cx="140" cy="230" r="2" fill="#06b6d4" />
          <circle cx="210" cy="245" r="2.5" fill="#22d3ee" />

          {/* Connection Lines between Nodes */}
          <line x1="160" y1="170" x2="230" y2="160" stroke="#06b6d4" strokeWidth="0.75" strokeOpacity="0.5" />
          <line x1="230" y1="160" x2="260" y2="190" stroke="#06b6d4" strokeWidth="0.75" strokeOpacity="0.5" />
          <line x1="260" y1="190" x2="210" y2="245" stroke="#06b6d4" strokeWidth="0.75" strokeOpacity="0.5" />
          <line x1="180" y1="220" x2="140" y2="230" stroke="#06b6d4" strokeWidth="0.75" strokeOpacity="0.5" />
          <line x1="180" y1="220" x2="210" y2="245" stroke="#06b6d4" strokeWidth="0.75" strokeOpacity="0.5" />
        </g>
      </svg>

      {/* Floating Glass Telemetry Card matching reference image */}
      <div className="pointer-events-auto absolute right-4 top-4 sm:right-8 sm:top-8 z-20 rounded-2xl border border-white/[0.1] bg-[#0c1527]/80 p-3.5 sm:p-4 backdrop-blur-2xl shadow-[0_12px_36px_rgba(0,0,0,0.6),0_0_20px_rgba(6,182,212,0.15)] max-w-[200px] sm:max-w-[220px]">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          System Status
        </div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isOnline ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" : "bg-rose-500"
              }`}
            />
            <span className="text-base font-bold text-slate-100">
              {statusLabel}
            </span>
          </div>

          {/* Luminous Telemetry Wave Line */}
          <svg
            className="h-6 w-16 text-cyan-400"
            viewBox="0 0 80 24"
            fill="none"
          >
            <path
              d="M 0 12 Q 10 3, 20 12 T 40 12 T 60 12 T 80 12"
              stroke="#06b6d4"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="mt-1.5 text-[10px] text-slate-400">
          AI Security Intelligence Platform
        </div>
      </div>
    </div>
  );
}
