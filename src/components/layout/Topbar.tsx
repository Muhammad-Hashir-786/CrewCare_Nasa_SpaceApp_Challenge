"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertOctagon, ChevronRight, Sparkles } from "lucide-react";
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
  const pathname = usePathname();
  const router = useRouter();
  const askAiHref = pathname.startsWith("/mission-control") ? "/mission-control/intelligence" : "/astronaut/intelligence";
  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === "a" && !event.ctrlKey && !event.metaKey) {
        const target = event.target;
        if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
        event.preventDefault();
        router.push(askAiHref);
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [askAiHref, router]);
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
          <Link href={askAiHref} className="topbar-ai-link" aria-keyshortcuts="Alt+A" title="Ask CrewCare AI (Alt+A)"><Sparkles size={17}/><span>Ask AI</span><kbd>Alt+A</kbd></Link>
          {emergencyHref
            ? <Link href={emergencyHref} className="emergency-btn" aria-label="CrewCare · Demo"><AlertOctagon size={22} strokeWidth={1.9}/><span>Emergency</span></Link>
            : <EmergencyAssistant context={emergencyContext}/>}
          {onSignOut && <button type="button" onClick={onSignOut} aria-label="Sign out of Mission Control" style={{ border: "1px solid var(--line)", borderRadius: 7, background: "transparent", color: "#4d605d", padding: "8px 10px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>Sign out</button>}
          <Link href={profileHref} className="avatar-btn" aria-label="Switch demo astronaut profile">
            <span className="avatar-initials">{astronautInitials}</span>
            <span>
              <div className="avatar-name">{astronautName}</div>
              <div className="avatar-role">{astronautRole}</div>
            </span>
            <ChevronRight size={14} strokeWidth={1.7} style={{ color: "#08784f" }} />
          </Link>
        </div>
      </header>

    </>
  );
}
