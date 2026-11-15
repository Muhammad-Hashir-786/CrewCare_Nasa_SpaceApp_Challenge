"use client";

import Link from "next/link";
import { AlertOctagon, ChevronRight } from "lucide-react";
import { EmergencyAssistant, type EmergencyContext } from "@/components/emergency/EmergencyAssistant";

interface TopbarProps {
  astronautName?: string;
  astronautRole?: string;
  astronautInitials?: string;
  emergencyContext?: EmergencyContext;
  emergencyHref?: string;
  keepDemoModeOnMobile?: boolean;
  onSignOut?: () => void;
  profileHref?: string;
}

export function Topbar({
  astronautName = "Alex Morgan",
  astronautRole = "Flight Engineer",
  astronautInitials = "AM",
  emergencyContext,
  emergencyHref,
  keepDemoModeOnMobile = false,
  onSignOut,
  profileHref = "/select",
}: TopbarProps) {
  return (
    <>
      <header className={`topbar${keepDemoModeOnMobile ? " topbar-astronaut" : ""}`}>
        <Link href="/" className="brand" aria-label="Crew Care home">
          <span className="brand-mark">
            <span className="brand-mark-dot" />
          </span>
          <span className="brand-name">
            CREW<span className="brand-accent">CARE</span>
          </span>
        </Link>

        <div className="top-actions">
          <div className="connection">
            <span className="live-dot" aria-hidden="true" />
            <span>Demo mode</span>
          </div>
          {emergencyHref
            ? <Link href={emergencyHref} className="emergency-btn" aria-label="Open emergency assistance"><AlertOctagon size={22} strokeWidth={1.9}/><span>Emergency</span></Link>
            : <EmergencyAssistant context={emergencyContext}/>}
          {onSignOut && <button type="button" onClick={onSignOut} aria-label="Sign out or change mission officer" style={{ border: "1px solid var(--line)", borderRadius: 7, background: "transparent", color: "#a8c5c1", padding: "8px 10px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>Change officer</button>}
          <Link href={profileHref} className="avatar-btn" aria-label="Switch demo astronaut profile">
            <span className="avatar-initials">{astronautInitials}</span>
            <span>
              <div className="avatar-name">{astronautName}</div>
              <div className="avatar-role">{astronautRole}</div>
            </span>
            <ChevronRight size={14} strokeWidth={1.7} style={{ color: "#647f7b" }} />
          </Link>
        </div>
      </header>

    </>
  );
}
