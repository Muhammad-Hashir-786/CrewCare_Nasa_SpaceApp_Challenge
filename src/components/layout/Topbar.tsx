"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { EmergencyAssistant, type EmergencyContext } from "@/components/emergency/EmergencyAssistant";

interface TopbarProps {
  astronautName?: string;
  astronautRole?: string;
  astronautInitials?: string;
  missionName?: string;
  missionSol?: string | number;
  emergencyContext?: EmergencyContext;
}

export function Topbar({
  astronautName = "Alex Morgan",
  astronautRole = "Flight Engineer",
  astronautInitials = "AM",
  missionName = "HORIZON VII",
  missionSol = 184,
  emergencyContext,
}: TopbarProps) {
  return (
    <>
      <header className="topbar">
        <Link href="/" className="brand" aria-label="Crew Care home">
          <span className="brand-mark">
            <span className="brand-mark-dot" />
          </span>
          <span className="brand-name">
            CREW<span className="brand-accent">CARE</span>
          </span>
        </Link>

        <div className="mission-pill">
          <span className="live-dot" />
          <span>{missionName}</span>
          <span className="mission-pill-sep" />
          <span className="muted-text">SOL {missionSol}</span>
        </div>

        <div className="top-actions">
          <div className="connection">
            <span className="live-dot" aria-hidden="true" />
            <span>Demo mode</span>
          </div>
          <EmergencyAssistant context={emergencyContext}/>
          <Link href="/select" className="avatar-btn" aria-label="Switch demo astronaut profile">
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
