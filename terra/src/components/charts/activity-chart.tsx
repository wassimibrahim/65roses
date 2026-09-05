"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const AXIS = { fontSize: 10, fill: "#767c80", fontFamily: "var(--font-mono-num)" } as const;

export function ActivityChart({ data }: { data: { month: string; count: number }[] }) {
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="activity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4a5054" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#4a5054" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e6e2d9" vertical={false} />
          <XAxis
            dataKey="month"
            tick={AXIS}
            axisLine={{ stroke: "#d9d4ca" }}
            tickLine={false}
            tickFormatter={(v: string) => v.slice(5)}
          />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} width={26} allowDecimals={false} />
          <Tooltip
            cursor={{ stroke: "#d9d4ca" }}
            contentStyle={{
              background: "#16181a",
              border: "none",
              borderRadius: 2,
              fontSize: 11,
              color: "#fbfaf7",
            }}
            labelStyle={{ color: "#9aa0a3", fontSize: 10 }}
            formatter={(value: number) => [String(value), "Interactions"]}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#4a5054"
            strokeWidth={1.4}
            fill="url(#activity)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
