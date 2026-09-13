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
    <div className="relative min-h-screen bg-[#080c14] text-slate-100 antialiased selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* =========================================================================
          ATMOSPHERIC AMBIENT GLOW LIGHTING (matching reference visual depth)
          ========================================================================= */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
        aria-hidden="true"
      >
        {/* Top-left subtle cyan atmospheric glow */}
        <div className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-cyan-500/[0.08] blur-[140px]" />
        {/* Top-center deep blue atmospheric glow */}
        <div className="absolute -top-40 left-1/3 h-[520px] w-[520px] rounded-full bg-sky-600/[0.06] blur-[160px]" />
        {/* Top-right subtle purple ambient glow */}
        <div className="absolute -top-32 -right-32 h-[440px] w-[440px] rounded-full bg-purple-600/[0.07] blur-[150px]" />
        {/* Bottom-left subtle violet glow */}
        <div className="absolute -bottom-32 left-10 h-[460px] w-[460px] rounded-full bg-indigo-600/[0.06] blur-[150px]" />
        {/* Bottom-right subtle fuchsia/purple glow */}
        <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-fuchsia-600/[0.08] blur-[160px]" />
      </div>

      {/* Foreground Interactive Content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Floating Glass Topbar */}
        <Topbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        {/* Layout: Narrow Icon Rail + Main Open Workspace */}
        <div className="flex flex-1">
          {/* Narrow Vertical Glass Rail Navigation */}
          <Sidebar
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
          />

          {/* Main Open Workspace */}
          <div className="flex min-w-0 flex-1 flex-col lg:pl-20">
            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-6 lg:px-8">
              {children}
            </main>

            {/* Bottom Glass Status Bar */}
            <footer className="mt-8 border-t border-white/[0.06] bg-[#0a1223]/40 px-4 py-3 text-xs text-slate-500 backdrop-blur-md sm:px-6">
              <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-400">
                    ThreatTrace
                  </span>
                  <span>•</span>
                  <span>AI Security Intelligence Platform</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                  <span className="text-slate-500">API Endpoint:</span>
                  <span className="rounded-lg border border-white/[0.08] bg-[#0c1527]/70 px-2 py-0.5 text-cyan-300">
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
