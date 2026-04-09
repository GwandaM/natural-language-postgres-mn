"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { GeoRow } from "@/lib/insights";

interface GeoDistributionProps {
  data: GeoRow[];
  caption: string;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function GeoDistribution({ data, caption }: GeoDistributionProps) {
  // TODO: upgrade to a proper choropleth world map (e.g. react-simple-maps)
  const top = data.slice(0, 15);

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
      <div>
        <h3 className="font-semibold text-foreground">Global Distribution</h3>
        <p className="text-xs text-muted-foreground mt-1">{caption}</p>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={top}
          layout="vertical"
          margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
          />
          <YAxis
            type="category"
            dataKey="country"
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
            width={110}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: 12,
            }}
            formatter={(v: number, _name: string, props) => [
              `${v} companies (${props.payload.pct}%)`,
              "Count",
            ]}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {top.map((_entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
