"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { HealthRecord } from "@/types";
import { formatAppDate } from "@/lib/health/checkin-store";

interface VitalsChartProps {
  records: HealthRecord[];
  metric: keyof HealthRecord;
  label: string;
  unit: string;
  color?: string;
  warnMax?: number;
  warnMin?: number;
  height?: number;
  axisLabelColor?: string;
  axisLabelFontSize?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ color?: string; value?: unknown }>;
  label?: string | number;
  unit: string;
}

const CustomTooltip = ({ active, payload, label, unit }: CustomTooltipProps) => {
  const item = payload?.[0];
  if (!active || !item) return null;
  return (
    <div style={{
      background: "var(--cc-bg-elevated)",
      border: "1px solid var(--cc-border)",
      borderRadius: 6,
      padding: "8px 12px",
      fontSize: 13,
    }}>
      <p style={{ margin: "0 0 4px", color: "var(--cc-text-muted)", fontSize: 11 }}>{label}</p>
      <p style={{ margin: 0, color: item.color, fontWeight: 700 }}>
        {String(item.value ?? "—")} {unit}
      </p>
    </div>
  );
};

export function VitalsChart({ records, metric, label, unit, color = "#00d4ff", warnMax, warnMin, height = 140, axisLabelColor = "#4a6a8a", axisLabelFontSize = 10 }: VitalsChartProps) {
  const data = records.map((r) => ({
    date: formatAppDate(r.recordedAt, { month: "short", day: "numeric" }),
    value: r[metric] as number | null,
  })).filter((d) => d.value != null);

  if (data.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 140, color: "var(--cc-text-muted)", fontSize: 13 }}>
        No {label} data recorded
      </div>
    );
  }

  return (
    <div>
      <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--cc-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label} <span style={{ color: "var(--cc-text-muted)", fontWeight: 400 }}>({unit})</span>
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f44" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: axisLabelFontSize, fill: axisLabelColor }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: axisLabelFontSize, fill: axisLabelColor }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={(props) => <CustomTooltip {...props} unit={unit} />} />
          {warnMax && (
            <ReferenceLine y={warnMax} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.6} />
          )}
          {warnMin && (
            <ReferenceLine y={warnMin} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.6} />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
