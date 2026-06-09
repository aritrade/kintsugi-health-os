"use client";

import {
  Area,
  CartesianGrid,
  Line,
  ComposedChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TrendPoint = { date: string; value: number };

// Line chart with the reference band shaded (docs/11-wireframes.md S13).
export function LabTrendChart({
  series,
  refLow,
  refHigh,
  unit,
}: {
  series: TrendPoint[];
  refLow: number | null;
  refHigh: number | null;
  unit: string | null;
}) {
  const values = series.map((s) => s.value);
  const dataMin = Math.min(...values, refLow ?? Infinity);
  const dataMax = Math.max(...values, refHigh ?? -Infinity);
  const pad = (dataMax - dataMin || 1) * 0.15;
  const yMin = Math.floor(dataMin - pad);
  const yMax = Math.ceil(dataMax + pad);

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={series} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis domain={[yMin, yMax]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            formatter={(v: number) => [`${v}${unit ? ` ${unit}` : ""}`, "Value"]}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          {refLow != null && refHigh != null && (
            <ReferenceArea
              y1={refLow}
              y2={refHigh}
              fill="hsl(var(--primary))"
              fillOpacity={0.12}
              stroke="hsl(var(--primary))"
              strokeOpacity={0.25}
            />
          )}
          <Area type="monotone" dataKey="value" stroke="none" fill="hsl(var(--primary))" fillOpacity={0.05} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
