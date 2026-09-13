import { ComponentType, useState } from "react";
import { NavLink } from "react-router-dom";
import { IconProps } from "../icons";
import { GlassTooltip } from "../ui/GlassTooltip";

export interface SidebarItemProps {
  name: string;
  path: string;
  category: string;
  description: string;
  icon: ComponentType<IconProps>;
  isActive: boolean;
  onNavigate?: () => void;
}

export function SidebarItem({
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
      className="relative flex items-center justify-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <NavLink
        to={path}
        onClick={onNavigate}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        aria-label={name}
        title={name}
        className={`group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 ${
          isActive
            ? "border border-cyan-400/60 bg-cyan-500/20 text-cyan-300 shadow-[0_0_16px_rgba(6,182,212,0.35)]"
            : "border border-transparent text-slate-400 hover:border-white/[0.08] hover:bg-white/[0.06] hover:text-cyan-300"
        }`}
      >
        {/* Active glowing indicator bar on the left edge */}
        {isActive && (
          <span className="absolute -left-2 top-2 bottom-2 w-1 rounded-r-full bg-cyan-400 shadow-[0_0_10px_#06b6d4]" />
        )}
        <Icon
          size={20}
          className={`transition-transform duration-200 ${
            isActive ? "scale-105 text-cyan-300" : "group-hover:scale-110"
          }`}
        />
      </NavLink>

      {/* Floating Glass Tooltip on Hover */}
      <GlassTooltip
        category={category}
        title={name}
        description={description}
        icon={<Icon size={18} />}
        visible={hovered}
      />
    </div>
  );
}
