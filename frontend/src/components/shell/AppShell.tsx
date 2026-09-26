import { ReactNode, useState } from "react";
import { API_BASE_URL } from "../../api";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-[#0e0b14] text-[#e8e1d5] antialiased selection:bg-[#c8a96e]/25 selection:text-[#dfc28d]">
      {/* =========================================================================
          ATMOSPHERIC CODEX VIGNETTE & CELESTIAL PLUM UNDERTONES (No neon/grids)
          ========================================================================= */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden z-0 opacity-80"
        aria-hidden="true"
      >
        {/* Soft upper celestial plum aura */}
        <div className="absolute -top-40 left-1/4 h-[500px] w-[600px] rounded-full bg-[#3b294e]/15 blur-[140px]" />
        {/* Warm antique bronze accent glow */}
        <div className="absolute top-10 -right-20 h-[400px] w-[400px] rounded-full bg-[#c8a96e]/05 blur-[160px]" />
        {/* Deep lower indigo-velvet floor */}
        <div className="absolute -bottom-40 left-10 h-[500px] w-[500px] rounded-full bg-[#231733]/25 blur-[160px]" />
      </div>

      {/* Foreground Workspace Content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Archival Header */}
        <Topbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        {/* Layout: Codex Chapter Rail + Main Folio Workspace */}
        <div className="flex flex-1">
          {/* Chapter Navigation Rail */}
          <Sidebar
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
          />

          {/* Main Workspace Folio */}
          <div className="flex min-w-0 flex-1 flex-col lg:pl-20">
            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-6 lg:px-8">
              {children}
            </main>

            {/* Archival Status & Ledger Footer */}
            <footer className="mt-8 border-t border-[#c8a96e]/15 bg-[#120d1a]/80 px-4 py-3 text-xs text-[#a498b2] backdrop-blur-md sm:px-6">
              <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-serif">
                  <span className="font-bold tracking-wider text-[#dfc28d]">
                    ZENTRA
                  </span>
                  <span className="text-[#c8a96e]/60">❖</span>
                  <span className="tracking-wide text-[#d5cbbd]">
                    Intelligence Archive & Forensic Codex
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-[#a498b2]">
                  <span className="text-[#8d809c]">Endpoint:</span>
                  <span className="rounded border border-[#c8a96e]/20 bg-[#1a1324] px-2 py-0.5 text-[#dfc28d]">
                    {API_BASE_URL}
                  </span>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
