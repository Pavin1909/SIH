import { NavLink, useLocation } from "react-router-dom";
import {
  FileText,
  Globe,
  Home,
  Mail,
  Server,
  Settings as SettingsIcon,
  X,
} from "../icons";
import { SidebarItem } from "./SidebarItem";

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface NavDefinition {
  number: string;
  name: string;
  path: string;
  category: string;
  description: string;
  icon: typeof Home;
  isActive: (pathname: string) => boolean;
}

export const NAVIGATION_ITEMS: NavDefinition[] = [
  {
    number: "01",
    name: "The Archive",
    path: "/",
    category: "Overview",
    description: "Real-time threat ledger & investigative overview",
    icon: Home,
    isActive: (p) => p === "/",
  },
  {
    number: "02",
    name: "Email Cases",
    path: "/email-analysis",
    category: "Case Files",
    description: "Deposit correspondence for forensic examination",
    icon: Mail,
    isActive: (p) => p === "/email-analysis" || p.startsWith("/analyses/"),
  },
  {
    number: "03",
    name: "Domain Dossiers",
    path: "/forensics",
    category: "Investigation",
    description: "Specimen inspection, behavioral & visual analysis",
    icon: Globe,
    isActive: (p) => p.startsWith("/forensics"),
  },
  {
    number: "04",
    name: "Threat Atlas",
    path: "/infrastructure",
    category: "Cartography",
    description: "Geospatial threat registry, DNS, and IP intelligence",
    icon: Server,
    isActive: (p) => p.startsWith("/infrastructure"),
  },
  {
    number: "05",
    name: "Case Reports",
    path: "/reports",
    category: "Archives",
    description: "Classified case ledger & forensic intelligence dossiers",
    icon: FileText,
    isActive: (p) => p.startsWith("/reports"),
  },
  {
    number: "06",
    name: "Atelier & System",
    path: "/settings",
    category: "System",
    description: "Atelier configuration & backend connectivity",
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
          DESKTOP: Narrow Vertical Codex Rail (Chapter Number + Icon)
          ========================================================================= */}
      <aside
        aria-label="Codex Navigation Rail"
        className="hidden lg:flex fixed left-4 top-20 bottom-6 z-40 w-16 flex-col items-center justify-between rounded-xl border border-[#c8a96e]/25 bg-[#140e1e]/90 p-2 py-4 shadow-[0_12px_40px_rgba(0,0,0,0.65)] backdrop-blur-2xl transition-all"
      >
        {/* Top Flourish */}
        <div className="font-serif text-[10px] text-[#c8a96e]/50 select-none">
          ❖
        </div>

        {/* Chapter Items */}
        <nav className="flex flex-col items-center gap-2.5 w-full my-auto">
          {NAVIGATION_ITEMS.map((item, idx) => (
            <div key={item.path} className="w-full flex flex-col items-center">
              <SidebarItem
                number={item.number}
                name={item.name}
                path={item.path}
                category={item.category}
                description={item.description}
                icon={item.icon}
                isActive={item.isActive(currentPath)}
              />
              {idx < NAVIGATION_ITEMS.length - 1 && (
                <div className="my-1 h-[1px] w-6 bg-[#c8a96e]/15" />
              )}
            </div>
          ))}
        </nav>

        {/* Bottom Flourish */}
        <div className="font-serif text-[10px] text-[#c8a96e]/50 select-none">
          ❖
        </div>
      </aside>

      {/* =========================================================================
          MOBILE / TABLET: Slide-Out Chapter Drawer
          ========================================================================= */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#0e0b14]/80 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer Folio */}
          <div className="fixed inset-y-0 left-0 flex w-72 flex-col border-r border-[#c8a96e]/30 bg-[#161122] p-5 shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-[#c8a96e]/20 pb-4">
              <div className="space-y-0.5">
                <div className="font-serif text-sm font-bold tracking-wider text-[#dfc28d]">
                  ZENTRA CODEX
                </div>
                <div className="font-serif text-[10px] tracking-widest text-[#a498b2] uppercase">
                  Investigation Chapters
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-[#a498b2] hover:text-[#dfc28d] transition-colors"
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation List */}
            <nav className="mt-4 flex flex-1 flex-col gap-1.5 overflow-y-auto">
              {NAVIGATION_ITEMS.map((item) => {
                const active = item.isActive(currentPath);
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
                      active
                        ? "border border-[#c8a96e]/40 bg-[#251b36] text-[#f5ebd9] shadow-sm"
                        : "text-[#a498b2] hover:bg-[#1a1324] hover:text-[#dfc28d]"
                    }`}
                  >
                    <span className="font-serif text-xs font-bold text-[#c8a96e]">
                      {item.number}
                    </span>
                    <Icon size={16} className={active ? "text-[#dfc28d]" : ""} />
                    <div className="min-w-0 flex-1">
                      <div className="font-serif text-xs font-bold tracking-wide">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-[#8d809c] truncate">
                        {item.description}
                      </div>
                    </div>
                  </NavLink>
                );
              })}
            </nav>

            {/* Drawer Footer */}
            <div className="border-t border-[#c8a96e]/15 pt-3 text-center">
              <span className="font-serif text-[10px] tracking-widest text-[#8d809c] uppercase">
                Investigation Atelier • Active
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
