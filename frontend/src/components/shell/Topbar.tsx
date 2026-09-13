import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { api } from "../../api";
import { Bell, Menu, Search, Shield, User } from "../icons";
import { StatusIndicator, SystemStatus } from "../ui/StatusIndicator";

export interface TopbarProps {
  onOpenMobileMenu: () => void;
}

export function Topbar({ onOpenMobileMenu }: TopbarProps) {
  const [health, setHealth] = useState<SystemStatus>("checking");
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let isMounted = true;
    api
      .health()
      .then((res) => {
        if (!isMounted) return;
        const s = (res?.status || "").toLowerCase();
        if (s === "degraded") setHealth("degraded");
        else setHealth("online");
      })
      .catch(() => {
        if (!isMounted) return;
        setHealth("offline");
      });

    // Ctrl+K keyboard shortcut to focus search
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      isMounted = false;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const healthLabels: Record<SystemStatus, string> = {
    online: "Backend Online",
    degraded: "Backend Degraded",
    offline: "API Offline",
    checking: "Connecting…",
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6">
      {/* =========================================================================
          LEFT: Brand in sleek glass container + Mobile Menu Toggle
          ========================================================================= */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>

        {/* Brand container */}
        <NavLink
          to="/"
          className="group flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#0a1223]/60 px-3.5 py-1.5 backdrop-blur-xl shadow-sm transition-all hover:border-cyan-500/30 hover:bg-[#0c1527]/80"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-transform group-hover:scale-105">
            <Shield size={18} />
          </div>
          <div>
            <div className="text-sm font-bold tracking-wider text-slate-100 group-hover:text-white">
              THREATTRACE
            </div>
            <div className="text-[9px] font-semibold tracking-widest text-cyan-400 uppercase">
              AI Security Intelligence
            </div>
          </div>
        </NavLink>
      </div>

      {/* =========================================================================
          CENTER: Floating Glass Search Bar (matching reference design)
          ========================================================================= */}
      <div className="hidden md:flex flex-1 max-w-lg items-center">
        <div className="relative w-full">
          <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <Search size={16} />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search investigations, domains, or metadata…"
            className="w-full rounded-full border border-white/[0.08] bg-[#0c1527]/50 py-1.5 pl-10 pr-16 text-xs text-slate-200 placeholder-slate-500 backdrop-blur-xl shadow-inner transition-all focus:border-cyan-500/50 focus:bg-[#0d172c]/80 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
            <kbd className="rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
              Ctrl K
            </kbd>
          </div>
        </div>
      </div>

      {/* =========================================================================
          RIGHT: Backend Health, Notification Bell, SOC Analyst User Pill
          ========================================================================= */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Backend health pill */}
        <div className="flex items-center rounded-full border border-white/[0.08] bg-[#0c1527]/60 px-3 py-1.5 backdrop-blur-xl shadow-sm">
          <StatusIndicator
            status={health}
            label={healthLabels[health]}
            size="sm"
          />
        </div>

        {/* Notifications Icon Button */}
        <button
          type="button"
          aria-label="View security notifications"
          title="Security Notifications"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-[#0c1527]/60 text-slate-400 backdrop-blur-xl transition-all hover:border-cyan-500/30 hover:bg-white/[0.08] hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
        >
          <Bell size={16} />
        </button>

        {/* SOC Analyst User Pill (strictly static role, no fake identity) */}
        <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#0c1527]/60 px-3 py-1.5 backdrop-blur-xl shadow-sm">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            <User size={12} />
          </div>
          <span className="text-xs font-semibold text-slate-200">
            SOC Analyst
          </span>
        </div>
      </div>
    </header>
  );
}
