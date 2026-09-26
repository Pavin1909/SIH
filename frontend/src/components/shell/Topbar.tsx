import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { api } from "../../api";
import { Bell, Menu, Search, Shield, User } from "../icons";
import { SystemStatus } from "../ui/StatusIndicator";

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

  const healthConfigs: Record<
    SystemStatus,
    { label: string; text: string; bg: string; border: string; dot: string }
  > = {
    online: {
      label: "Atelier Online",
      text: "text-[#a8e6cf]",
      bg: "bg-[#14261d]/80",
      border: "border-[#558f70]/40",
      dot: "bg-[#558f70]",
    },
    degraded: {
      label: "Atelier Degraded",
      text: "text-[#ffd180]",
      bg: "bg-[#291c0a]/80",
      border: "border-[#e2a554]/40",
      dot: "bg-[#e2a554]",
    },
    offline: {
      label: "Atelier Offline",
      text: "text-[#ff8a9a]",
      bg: "bg-[#2c1218]/80",
      border: "border-[#b4384d]/40",
      dot: "bg-[#b4384d]",
    },
    checking: {
      label: "Attuning…",
      text: "text-[#dfc28d]",
      bg: "bg-[#221830]/80",
      border: "border-[#c8a96e]/40",
      dot: "bg-[#dfc28d] animate-pulse",
    },
  };

  const statusStyle = healthConfigs[health] || healthConfigs.offline;

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6">
      {/* =========================================================================
          LEFT: Archival Brand Signet & Mobile Menu
          ========================================================================= */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-lg p-2 text-[#a498b2] hover:bg-[#1f172c] hover:text-[#dfc28d] lg:hidden focus:outline-none"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>

        <NavLink
          to="/"
          className="group flex items-center gap-3 rounded-xl border border-[#c8a96e]/30 bg-[#140e1e]/85 px-3.5 py-1.5 backdrop-blur-xl shadow-md transition-all hover:border-[#dfc28d]/60 hover:bg-[#1a1226]"
        >
          {/* Signet Crest */}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#c8a96e]/50 bg-gradient-to-b from-[#2e2142] to-[#181024] text-[#dfc28d] shadow-sm transition-transform group-hover:scale-105">
            <Shield size={16} />
          </div>
          <div>
            <div className="font-serif text-sm font-extrabold tracking-wider text-[#f5ebd9] group-hover:text-white">
              ZENTRA
            </div>
            <div className="font-serif text-[9px] font-semibold tracking-widest text-[#c8a96e] uppercase">
              Intelligence Archive
            </div>
          </div>
        </NavLink>
      </div>

      {/* =========================================================================
          CENTER: Archival Dossier Search Folio
          ========================================================================= */}
      <div className="hidden md:flex flex-1 max-w-lg items-center">
        <div className="relative w-full">
          <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c8a96e]/70">
            <Search size={15} />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search case archives, indicators, or domains…"
            className="w-full rounded-full border border-[#c8a96e]/25 bg-[#140e1f]/75 py-1.5 pl-10 pr-16 text-xs text-[#e8e1d5] placeholder-[#7d718b] backdrop-blur-xl shadow-inner transition-all focus:border-[#dfc28d]/60 focus:bg-[#191124] focus:outline-none focus:ring-1 focus:ring-[#c8a96e]/30"
          />
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            <kbd className="rounded border border-[#c8a96e]/25 bg-[#20162e] px-1.5 py-0.5 font-serif text-[10px] text-[#c8a96e]">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* =========================================================================
          RIGHT: Atelier Status Seal, Bells, & Investigator Signet
          ========================================================================= */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Status Seal */}
        <div
          className={`flex items-center gap-2 rounded-full border px-3 py-1 font-serif text-xs font-semibold backdrop-blur-xl ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}
        >
          <span className={`h-2 w-2 rounded-full ${statusStyle.dot}`} />
          <span>{statusStyle.label}</span>
        </div>

        {/* Archival Dispatch Bell */}
        <button
          type="button"
          aria-label="View archival dispatches"
          title="Archival Dispatches"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#c8a96e]/25 bg-[#140e1f]/80 text-[#a498b2] backdrop-blur-xl transition-all hover:border-[#dfc28d]/50 hover:bg-[#20162e] hover:text-[#dfc28d] focus:outline-none"
        >
          <Bell size={15} />
        </button>

        {/* Investigator Signet Pill */}
        <div className="flex items-center gap-2 rounded-full border border-[#c8a96e]/25 bg-[#140e1f]/80 px-3 py-1 backdrop-blur-xl shadow-sm">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2a1f3c] text-[#dfc28d] border border-[#c8a96e]/40">
            <User size={11} />
          </div>
          <span className="font-serif text-xs font-semibold text-[#f5ebd9]">
            Investigator
          </span>
        </div>
      </div>
    </header>
  );
}
