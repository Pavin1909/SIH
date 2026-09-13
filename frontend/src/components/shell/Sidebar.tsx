import { NavLink, useLocation } from "react-router-dom";
import {
  ChevronsRight,
  FileText,
  Globe,
  Home,
  Mail,
  Server,
  Settings as SettingsIcon,
  Shield,
  X,
} from "../icons";
import { SidebarItem } from "./SidebarItem";

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavDefinition {
  name: string;
  path: string;
  category: string;
  description: string;
  icon: typeof Home;
  isActive: (pathname: string) => boolean;
}

export const NAVIGATION_ITEMS: NavDefinition[] = [
  {
    name: "Dashboard",
    path: "/",
    category: "Overview",
    description: "Real-time SOC telemetry & overview",
    icon: Home,
    isActive: (p) => p === "/",
  },
  {
    name: "Email Analysis",
    path: "/email-analysis",
    category: "Analysis",
    description: "RFC 822 parsing & AI phishing detection",
    icon: Mail,
    isActive: (p) => p === "/email-analysis" || p.startsWith("/analyses/"),
  },
  {
    name: "Web Forensics",
    path: "/forensics",
    category: "Investigation",
    description: "Browser sandbox, DOM signals & VLM",
    icon: Globe,
    isActive: (p) => p.startsWith("/forensics"),
  },
  {
    name: "Infrastructure",
    path: "/infrastructure",
    category: "Investigation",
    description: "Live DNS, GeoIP, ASN & provider intel",
    icon: Server,
    isActive: (p) => p.startsWith("/infrastructure"),
  },
  {
    name: "Reports",
    path: "/reports",
    category: "Reporting",
    description: "Forensic evidence & case summaries",
    icon: FileText,
    isActive: (p) => p.startsWith("/reports"),
  },
  {
    name: "Settings",
    path: "/settings",
    category: "System",
    description: "Platform config & API telemetry",
    icon: SettingsIcon,
    isActive: (p) => p.startsWith("/settings"),
  },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <>
      {/* =========================================================================
          DESKTOP & TABLET: Narrow Vertical Glass Rail (Icon-Only Default State)
          ========================================================================= */}
      <aside
        aria-label="Sidebar Navigation"
        className="hidden lg:flex fixed left-4 top-20 bottom-6 z-40 w-14 flex-col items-center justify-between rounded-2xl border border-white/[0.08] bg-[#0a1223]/70 p-2 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-all"
      >
        {/* Navigation Items (Icon-first) */}
        <nav className="flex flex-col items-center gap-3 w-full">
          {NAVIGATION_ITEMS.map((item) => (
            <SidebarItem
              key={item.path}
              name={item.name}
              path={item.path}
              category={item.category}
              description={item.description}
              icon={item.icon}
              isActive={item.isActive(currentPath)}
            />
          ))}
        </nav>

        {/* Rail Footer Action (Expand/Action icon from reference design) */}
        <div className="flex flex-col items-center pt-2">
          <button
            type="button"
            onClick={onClose}
            title="Expand Navigation Drawer"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-slate-500 hover:border-white/10 hover:bg-white/[0.06] hover:text-cyan-300 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
          >
            <ChevronsRight size={18} />
          </button>
        </div>
      </aside>

      {/* =========================================================================
          MOBILE: Glass Navigation Drawer (Opened via mobile hamburger button)
          ========================================================================= */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#080c14]/80 backdrop-blur-md lg:hidden"
          onClick={onClose}
        >
          <div
            className="fixed inset-y-0 left-0 w-72 border-r border-white/[0.08] bg-[#0a1223]/95 p-5 shadow-2xl backdrop-blur-2xl flex flex-col justify-between animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              {/* Mobile Drawer Header */}
              <div className="flex items-center justify-between pb-5 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                    <Shield size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-bold tracking-wider text-slate-100">
                      THREATTRACE
                    </div>
                    <div className="text-[10px] font-semibold tracking-wider text-cyan-400">
                      AI Security Intelligence
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Mobile Links with Names & Categories */}
              <nav className="mt-5 space-y-1.5">
                {NAVIGATION_ITEMS.map((item) => {
                  const active = item.isActive(currentPath);
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={`flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                        active
                          ? "border border-cyan-400/40 bg-cyan-500/15 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                          : "border border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-200"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          active
                            ? "bg-cyan-500/20 text-cyan-300"
                            : "bg-white/[0.04] text-slate-400"
                        }`}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                          {item.category}
                        </div>
                        <div className="text-sm font-semibold text-slate-200">
                          {item.name}
                        </div>
                      </div>
                      {active && (
                        <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Mobile Footer */}
            <div className="pt-4 border-t border-white/[0.08] text-xs text-slate-500">
              <span className="font-semibold text-slate-400">ThreatTrace</span>{" "}
              Console v1.0
            </div>
          </div>
        </div>
      )}
    </>
  );
}
