import type { AssessmentStatus, AlertSeverity } from "@/types";

interface StatusBadgeProps {
  status: AssessmentStatus | AlertSeverity | string;
  size?: "sm" | "md";
  showDot?: boolean;
}

const CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  GREEN:        { label: "GREEN",    color: "#10b981", bg: "rgba(16,185,129,0.12)",  dot: "#10b981" },
  AMBER:        { label: "AMBER",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  dot: "#f59e0b" },
  RED:          { label: "RED",      color: "#ef4444", bg: "rgba(239,68,68,0.12)",   dot: "#ef4444" },
  LOW:          { label: "LOW",      color: "#10b981", bg: "rgba(16,185,129,0.12)",  dot: "#10b981" },
  MEDIUM:       { label: "MEDIUM",   color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  dot: "#f59e0b" },
  HIGH:         { label: "HIGH",     color: "#ef4444", bg: "rgba(239,68,68,0.12)",   dot: "#ef4444" },
  CRITICAL:     { label: "CRITICAL", color: "#ef4444", bg: "rgba(239,68,68,0.18)",   dot: "#ef4444" },
  ACTIVE:       { label: "ACTIVE",   color: "#ef4444", bg: "rgba(239,68,68,0.12)",   dot: "#ef4444" },
  ACKNOWLEDGED: { label: "ACK'D",    color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  dot: "#f59e0b" },
  RESOLVED:     { label: "RESOLVED", color: "#10b981", bg: "rgba(16,185,129,0.12)",  dot: "#10b981" },
};

export function StatusBadge({ status, size = "md", showDot = true }: StatusBadgeProps) {
  const cfg = CONFIG[status] ?? { label: status, color: "#8fa8c8", bg: "rgba(143,168,200,0.12)", dot: "#8fa8c8" };
  const pad = size === "sm" ? "2px 8px" : "3px 10px";
  const fs  = size === "sm" ? "10px" : "11px";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: pad,
        borderRadius: 4,
        background: cfg.bg,
        border: `1px solid ${cfg.color}33`,
        color: cfg.color,
        fontSize: fs,
        fontWeight: 700,
        letterSpacing: "0.08em",
        whiteSpace: "nowrap",
      }}
    >
      {showDot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: cfg.dot,
            flexShrink: 0,
          }}
        />
      )}
      {cfg.label}
    </span>
  );
}
