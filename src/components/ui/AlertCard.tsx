"use client";

import type { Alert } from "@/types";
import { StatusBadge } from "./StatusBadge";

interface AlertCardProps {
  alert: Alert;
  astronautName?: string;
  onAcknowledge?: (id: string) => void;
}

const SEVERITY_BORDER: Record<string, string> = {
  CRITICAL: "#ef4444",
  HIGH:     "#ef4444",
  MEDIUM:   "#f59e0b",
  LOW:      "#10b981",
};

export function AlertCard({ alert, astronautName, onAcknowledge }: AlertCardProps) {
  const borderColor = SEVERITY_BORDER[alert.severity] ?? "#8fa8c8";
  const isActive = alert.status === "ACTIVE";

  return (
    <div
      style={{
        background: "var(--cc-bg-card)",
        border: `1px solid var(--cc-border-subtle)`,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 8,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <StatusBadge status={alert.severity} size="sm" />
            <StatusBadge status={alert.status} size="sm" showDot={false} />
            {astronautName && (
              <span style={{ fontSize: 11, color: "var(--cc-cyan)", fontWeight: 600 }}>
                {astronautName}
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--cc-text-primary)" }}>
            {alert.title}
          </p>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 13, color: "var(--cc-text-secondary)", lineHeight: 1.5 }}>
        {alert.message}
      </p>

      {alert.metric && alert.value != null && (
        <p style={{ margin: 0, fontSize: 12, color: "var(--cc-text-muted)" }}>
          Metric: <span style={{ color: "var(--cc-text-secondary)" }}>{alert.metric}</span>
          {" · "}Value: <span style={{ color: "var(--cc-amber)" }}>{alert.value}</span>
          {alert.threshold != null && (
            <> · Threshold: <span style={{ color: "var(--cc-text-secondary)" }}>{alert.threshold}</span></>
          )}
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 11, color: "var(--cc-text-muted)" }}>
          {new Date(alert.createdAt).toLocaleString()}
        </span>
        {isActive && onAcknowledge && (
          <button
            onClick={() => onAcknowledge(alert.id)}
            style={{
              padding: "4px 12px",
              background: "transparent",
              border: "1px solid var(--cc-border)",
              borderRadius: 4,
              color: "var(--cc-text-secondary)",
              fontSize: 12,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = "var(--cc-cyan)";
              (e.target as HTMLButtonElement).style.color = "var(--cc-cyan)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = "var(--cc-border)";
              (e.target as HTMLButtonElement).style.color = "var(--cc-text-secondary)";
            }}
          >
            Acknowledge
          </button>
        )}
        {alert.acknowledgedBy && (
          <span style={{ fontSize: 11, color: "var(--cc-text-muted)" }}>
            Acknowledged by {alert.acknowledgedBy}
          </span>
        )}
      </div>
    </div>
  );
}
