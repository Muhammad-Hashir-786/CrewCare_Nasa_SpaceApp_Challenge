import type { AssessmentStatus, AlertSeverity } from "@/types";

interface StatusBadgeProps {
  status: AssessmentStatus | AlertSeverity | string;
  size?: "sm" | "md";
  showDot?: boolean;
}

const CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  GREEN:        { label: "GREEN",    color: "#08784f", bg: "rgba(16,185,129,0.12)",  dot: "#10b981" },
  AMBER:        { label: "AMBER",    color: "#94600b", bg: "rgba(245,158,11,0.12)",  dot: "#f59e0b" },
  RED:          { label: "RED",      color: "#b42323", bg: "rgba(239,68,68,0.12)",   dot: "#ef4444" },
  LOW:          { label: "LOW",      color: "#08784f", bg: "rgba(16,185,129,0.12)",  dot: "#10b981" },
  MEDIUM:       { label: "MEDIUM",   color: "#94600b", bg: "rgba(245,158,11,0.12)",  dot: "#f59e0b" },
  HIGH:         { label: "HIGH",     color: "#b42323", bg: "rgba(239,68,68,0.12)",   dot: "#ef4444" },
  CRITICAL:     { label: "CRITICAL", color: "#b42323", bg: "rgba(239,68,68,0.18)",   dot: "#ef4444" },
  ACTIVE:       { label: "ACTIVE",   color: "#94600b", bg: "rgba(245,158,11,0.12)",  dot: "#f59e0b" },
  ACKNOWLEDGED: { label: "ACK'D",    color: "#94600b", bg: "rgba(245,158,11,0.12)",  dot: "#f59e0b" },
  RESOLVED:     { label: "RESOLVED", color: "#08784f", bg: "rgba(16,185,129,0.12)",  dot: "#10b981" },
};

export function StatusBadge({ status, size = "md", showDot = true }: StatusBadgeProps) {
  const cfg = CONFIG[status] ?? { label: status, color: "#4d605d", bg: "rgba(143,168,200,0.12)", dot: "#8fa8c8" };
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
