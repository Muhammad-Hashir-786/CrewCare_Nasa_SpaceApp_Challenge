// Crew Care — Health Category Helpers (Phase 3)

import type { HealthCategory } from "./assessment-types";

export const CATEGORY_COLORS: Record<HealthCategory, string> = {
  NORMAL:    "#10b981",
  ATTENTION: "#f59e0b",
  WARNING:   "#ef4444",
  CRITICAL:  "#ef4444",
};

export const CATEGORY_BG: Record<HealthCategory, string> = {
  NORMAL:    "rgba(16,185,129,0.08)",
  ATTENTION: "rgba(245,158,11,0.08)",
  WARNING:   "rgba(239,68,68,0.08)",
  CRITICAL:  "rgba(239,68,68,0.12)",
};

export const CATEGORY_BORDER: Record<HealthCategory, string> = {
  NORMAL:    "rgba(16,185,129,0.25)",
  ATTENTION: "rgba(245,158,11,0.25)",
  WARNING:   "rgba(239,68,68,0.3)",
  CRITICAL:  "rgba(239,68,68,0.5)",
};

export const CATEGORY_LABEL: Record<HealthCategory, string> = {
  NORMAL:    "Normal",
  ATTENTION: "Attention",
  WARNING:   "Warning",
  CRITICAL:  "Critical",
};

export function categoryFromStatus(status: string): HealthCategory {
  if (status === "RED") return "WARNING";
  if (status === "AMBER") return "ATTENTION";
  return "NORMAL";
}

export function statusFromCategory(cat: HealthCategory): "GREEN" | "AMBER" | "RED" {
  if (cat === "CRITICAL" || cat === "WARNING") return "RED";
  if (cat === "ATTENTION") return "AMBER";
  return "GREEN";
}
