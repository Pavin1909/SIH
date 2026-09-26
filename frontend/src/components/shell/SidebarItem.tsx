import { ComponentType, useState } from "react";
import { NavLink } from "react-router-dom";
import { IconProps } from "../icons";

export interface SidebarItemProps {
  number: string;
  name: string;
  path: string;
  category: string;
  description: string;
  icon: ComponentType<IconProps>;
  isActive: boolean;
  onNavigate?: () => void;
}

export function SidebarItem({
  number,
  name,
  path,
  category,
  description,
  icon: Icon,
  isActive,
  onNavigate,
}: SidebarItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex items-center justify-center w-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <NavLink
        to={path}
        onClick={onNavigate}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        aria-label={`${number} ${name}`}
        title={`${number} ${name}`}
        className={`group relative flex flex-col items-center justify-center w-12 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-[#c8a96e]/60 ${
          isActive
            ? "border border-[#c8a96e]/60 bg-gradient-to-b from-[#352549] to-[#20162e] text-[#f5ebd9] shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
            : "border border-transparent text-[#a498b2] hover:border-[#c8a96e]/25 hover:bg-[#1a1324] hover:text-[#dfc28d]"
        }`}
      >
        {/* Active chapter bookmark gold trim on the left edge */}
        {isActive && (
          <span className="absolute -left-1.5 top-1.5 bottom-1.5 w-1 rounded-r bg-gradient-to-b from-[#dfc28d] to-[#c8a96e] shadow-[0_0_8px_rgba(200,169,110,0.4)]" />
        )}

        {/* Small serif chapter number */}
        <span
          className={`font-serif text-[9px] tracking-wider transition-colors ${
            isActive ? "text-[#dfc28d] font-bold" : "text-[#7a6f87] group-hover:text-[#c8a96e]"
          }`}
        >
          {number}
        </span>

        {/* Icon */}
        <Icon
          size={18}
          className={`mt-0.5 transition-transform duration-200 ${
            isActive ? "scale-105 text-[#f5ebd9]" : "group-hover:scale-105"
          }`}
        />
      </NavLink>

      {/* Floating Codex Chapter Card on Hover (Desktop) */}
      {hovered && (
        <div className="hidden lg:block absolute left-16 z-50 w-56 rounded-lg border border-[#c8a96e]/40 bg-[#1a1324]/95 p-3 shadow-[0_12px_35px_rgba(0,0,0,0.7)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-[#c8a96e]/15 pb-1.5">
            <span className="font-serif text-[9px] font-bold tracking-widest text-[#c8a96e] uppercase">
              CHAPTER {number}
            </span>
            <span className="font-serif text-[9px] text-[#8d809c] uppercase">
              {category}
            </span>
          </div>
          <div className="mt-1.5 font-serif text-sm font-bold tracking-wide text-[#f5ebd9]">
            {name}
          </div>
          <p className="mt-1 text-[11px] text-[#a498b2] leading-relaxed">
            {description}
          </p>
        </div>
      )}
    </div>
  );
}
