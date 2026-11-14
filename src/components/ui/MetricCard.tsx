interface MetricCardProps {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  status?: "ok" | "warn" | "critical" | "na";
  icon?: React.ReactNode;
  trend?: "up" | "down" | "stable";
  note?: string;
}

const STATUS_COLOR = {
  ok:       "#10b981",
  warn:     "#f59e0b",
  critical: "#ef4444",
  na:       "#4a6a8a",
};

const TREND_ICON = { up: "↑", down: "↓", stable: "→" };
const TREND_COLOR = { up: "#ef4444", down: "#3b82f6", stable: "#8fa8c8" };

export function MetricCard({ label, value, unit, status = "na", icon, trend, note }: MetricCardProps) {
  const color = STATUS_COLOR[status];
  const isNA = value == null;

  return (
    <div
      style={{
        background: "var(--cc-bg-card)",
        border: `1px solid var(--cc-border-subtle)`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: "var(--cc-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {label}
        </span>
        {icon && <span style={{ color: "var(--cc-text-muted)", opacity: 0.7 }}>{icon}</span>}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: isNA ? "var(--cc-text-muted)" : color, letterSpacing: "-0.02em" }}>
          {isNA ? "—" : value}
        </span>
        {unit && !isNA && (
          <span style={{ fontSize: 13, color: "var(--cc-text-secondary)" }}>{unit}</span>
        )}
        {trend && !isNA && (
          <span style={{ fontSize: 13, color: TREND_COLOR[trend], fontWeight: 600 }}>
            {TREND_ICON[trend]}
          </span>
        )}
      </div>

      {note && (
        <p style={{ fontSize: 11, color: "var(--cc-text-muted)", margin: 0, lineHeight: 1.4 }}>{note}</p>
      )}
    </div>
  );
}
