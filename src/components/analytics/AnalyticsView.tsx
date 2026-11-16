"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AlertTriangle, Box, IndianRupee, TrendingUp } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import ChartCard from "./ChartCard";
import { BooksTab, CustomersTab, OperationsTab, ProfitTab } from "./AnalyticsTabs";
import type { AnalyticsData } from "@/db/analytics";
import { formatINR } from "@/lib/format";

const TABS = ["Overview", "Profit", "Books", "Customers", "Operations"] as const;
type Tab = (typeof TABS)[number];

const PIE_COLORS = ["#2563eb", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444"];
const tick = { fontSize: 13, fill: "hsl(var(--muted-foreground))" };
const axisLine = "hsl(var(--border))";
const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 14,
};
const compactINR = (v: number) => (v === 0 ? "₹0" : v >= 1000 ? "₹" + v / 1000 + "k" : "₹" + v);

interface Props {
  from: string;
  to: string;
  data: AnalyticsData;
}

export default function AnalyticsView({ from: initialFrom, to: initialTo, data }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("Overview");
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  // Changing a date reloads the page data from the database for that range.
  const changeRange = (nextFrom: string, nextTo: string) => {
    setFrom(nextFrom);
    setTo(nextTo);
    if (nextFrom && nextTo && nextFrom <= nextTo) {
      startTransition(() => router.replace(`/analytics?from=${nextFrom}&to=${nextTo}`));
    }
  };

  const s = data.summary;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground">
            Business Intelligence
          </p>
          <h1 className="mt-1 text-3xl font-semibold">Advanced Analytics</h1>
        </div>
        <div className="flex gap-3">
          <label className="block text-sm font-medium text-muted-foreground">
            From
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => changeRange(e.target.value, to)}
              className="mt-1 block h-11 rounded-lg border border-border bg-card px-3 text-base text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="block text-sm font-medium text-muted-foreground">
            To
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => changeRange(from, e.target.value)}
              className="mt-1 block h-11 rounded-lg border border-border bg-card px-3 text-base text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={formatINR(s.revenue)} icon={TrendingUp} tone="blue" />
        <StatCard
          label="Profit"
          value={formatINR(s.profit)}
          icon={IndianRupee}
          tone="green"
          hint={`${s.profitMargin}% margin`}
        />
        <StatCard label="Outstanding" value={formatINR(s.outstanding)} icon={AlertTriangle} tone="amber" />
        <StatCard label="Dead Stock Value" value={formatINR(s.deadStockValue)} icon={Box} tone="purple" />
      </div>

      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-3 text-base font-medium transition-colors ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartCard title="Payment Mode Split" height={260} empty={data.paymentModeSplit.length === 0}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.paymentModeSplit}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  stroke="none"
                  label={({ name }) => name}
                  labelLine
                >
                  {data.paymentModeSplit.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatINR(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Category Revenue" height={260} empty={data.categoryRevenue.length === 0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.categoryRevenue} layout="vertical" margin={{ left: 16, right: 16 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={axisLine} horizontal={false} />
                <XAxis type="number" tick={tick} tickFormatter={compactINR} stroke={axisLine} />
                <YAxis type="category" dataKey="category" tick={tick} width={120} stroke={axisLine} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={tooltipStyle}
                  formatter={(v) => [formatINR(Number(v)), "Revenue"]}
                />
                <Bar dataKey="revenue" fill="#2563eb" radius={[0, 6, 6, 0]} maxBarSize={80} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Monthly Units Sold" height={260} empty={data.monthlyUnitsSold.length === 0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyUnitsSold} margin={{ right: 16 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={axisLine} />
                <XAxis dataKey="month" tick={tick} stroke={axisLine} />
                <YAxis tick={tick} stroke={axisLine} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={tooltipStyle}
                  formatter={(v) => [v, "Units"]}
                />
                <Bar dataKey="units" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={120} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Repeat Customer Cohort"
            height={260}
            empty={data.repeatCustomerCohort.every((b) => b.customers === 0)}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.repeatCustomerCohort} margin={{ right: 16 }}>
                <CartesianGrid strokeDasharray="2 4" stroke={axisLine} />
                <XAxis dataKey="bucket" tick={tick} stroke={axisLine} />
                <YAxis tick={tick} stroke={axisLine} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={tooltipStyle}
                  formatter={(v) => [v, "Customers"]}
                />
                <Bar dataKey="customers" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={120} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      ) : tab === "Profit" ? (
        <ProfitTab data={data} />
      ) : tab === "Books" ? (
        <BooksTab data={data} />
      ) : tab === "Customers" ? (
        <CustomersTab data={data} />
      ) : (
        <OperationsTab data={data} />
      )}
    </div>
  );
}
