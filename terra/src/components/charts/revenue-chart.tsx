"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money } from "@/lib/format";

const AXIS = { fontSize: 10, fill: "#767c80", fontFamily: "var(--font-mono-num)" } as const;

export function RevenueChart({
  data,
}: {
  data: { year: string; revenue: number; ebitda: number }[];
}) {
  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <CartesianGrid stroke="#e6e2d9" vertical={false} />
          <XAxis dataKey="year" tick={AXIS} axisLine={{ stroke: "#d9d4ca" }} tickLine={false} />
          <YAxis
            tick={AXIS}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={(v: number) => money(v)}
          />
          <Tooltip
            cursor={{ fill: "rgba(232,226,214,0.35)" }}
            contentStyle={{
              background: "#16181a",
              border: "none",
              borderRadius: 2,
              fontSize: 11,
              color: "#fbfaf7",
            }}
            labelStyle={{ color: "#9aa0a3", fontSize: 10 }}
            formatter={(value: number, name) => [money(value), name === "revenue" ? "Revenue" : "EBITDA"]}
          />
          <Bar dataKey="revenue" fill="#e2ddd3" radius={0} maxBarSize={34} />
          <Line
            type="monotone"
            dataKey="ebitda"
            stroke="#1f4d3a"
            strokeWidth={1.5}
            dot={{ r: 2, fill: "#1f4d3a", strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
