"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Point {
  date: string;
  sales: number;
}

const tick = { fontSize: 13, fill: "hsl(var(--muted-foreground))" };

export default function SalesTrend({ data }: { data: Point[] }) {
  const hasSales = data.some((d) => d.sales > 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Sales Trend</h2>
      <p className="text-base text-muted-foreground">
        Last 14 days{!hasSales && " · no sales in this period"}
      </p>
      <div className="mt-4 h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={tick} stroke="hsl(var(--border))" />
            <YAxis
              domain={[0, (max: number) => Math.max(max, 1000)]}
              tick={tick}
              stroke="hsl(var(--border))"
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 14,
              }}
              formatter={(v) => ["₹" + Number(v).toLocaleString("en-IN"), "Sales"]}
            />
            <Line
              type="monotone"
              dataKey="sales"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3, fill: "hsl(var(--card))", stroke: "hsl(var(--primary))", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
