"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageSquare, Activity, FileText, AlertTriangle, BarChart2, LineChart, Sparkles, ArrowLeftRight } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  Icon: React.ElementType;
}

interface SidebarProps {
  mode: "astronaut" | "mission-control";
  missionDay?: number;
  missionTotal?: number;
}

const ASTRONAUT_NAV: NavItem[] = [
  { href: "/astronaut",           label: "Overview",  Icon: LayoutDashboard },
  { href: "/astronaut/checkin",   label: "Check-In",  Icon: MessageSquare },
  { href: "/astronaut/analytics", label: "Trends",    Icon: BarChart2 },
  { href: "/astronaut/intelligence", label: "AI Insights", Icon: Sparkles },
  { href: "/astronaut/history",   label: "History",   Icon: Activity },
  { href: "/astronaut/learn",     label: "Learn",     Icon: FileText },
];

const MC_NAV: NavItem[] = [
  { href: "/mission-control",        label: "Crew",   Icon: LayoutDashboard },
  { href: "/mission-control/command", label: "Command", Icon: ArrowLeftRight },
  { href: "/mission-control/analytics", label: "Analytics", Icon: LineChart },
  { href: "/mission-control/intelligence", label: "AI Intel", Icon: Sparkles },
  { href: "/mission-control/alerts", label: "Alerts", Icon: AlertTriangle },
];

export function Sidebar({ mode, missionDay = 184, missionTotal = 270 }: SidebarProps) {
  const pathname = usePathname();
  const nav = mode === "astronaut" ? ASTRONAUT_NAV : MC_NAV;
  const pct = Math.round((missionDay / missionTotal) * 100);

  function isActive(href: string) {
    if (href === "/astronaut" || href === "/mission-control") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <nav className="sidebar" aria-label="Main navigation">
      <div className="side-nav">
        {nav.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className={`side-btn${isActive(href) ? " active" : ""}`} aria-label={label}>
            <Icon size={20} strokeWidth={1.7} />
            <span>{label}</span>
          </Link>
        ))}
      </div>

      <div className="side-bottom">
        <div className="mission-progress">
          <small>MISSION</small>
          <strong>{missionDay} <span>/ {missionTotal}d</span></strong>
          <div className="mp-track">
            <i className="mp-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </nav>
  );
}
