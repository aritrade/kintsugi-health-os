"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = { date: string; value: number; avg: number };

// Index trend on a fixed 0-100 scale. The bold line is the 7-day rolling
// average (display value); raw daily points are shown faintly (docs/20 section 7).
export function IndexTrendChart({ series }: { series: Point[] }) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={series} margin={{ top: 8, right: 8, bottom: 4, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            formatter={(v: number, name: string) => [v, name === "avg" ? "7-day avg" : "Daily"]}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Area type="monotone" dataKey="avg" stroke="none" fill="hsl(var(--primary))" fillOpacity={0.06} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1}
            strokeOpacity={0.4}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="avg"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            dot={{ r: 2.5 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
