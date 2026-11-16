"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Clock, IndianRupee, Percent, Printer, Receipt, UserPlus } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import ChartCard from "./ChartCard";
import type { AnalyticsData } from "@/db/analytics";
import { formatINR } from "@/lib/format";

const PIE_COLORS = ["#2563eb", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];
const tick = { fontSize: 13, fill: "hsl(var(--muted-foreground))" };
const axisLine = "hsl(var(--border))";
const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 14,
};
const compactINR = (v: number) => (v === 0 ? "₹0" : Math.abs(v) >= 1000 ? "₹" + v / 1000 + "k" : "₹" + v);

function ListCard({
  title,
  headers,
  rows,
  empty,
}: {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-lg font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-base text-muted-foreground">{empty}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-base">
            <thead>
              <tr className="text-sm uppercase tracking-wider text-muted-foreground">
                {headers.map((h, i) => (
                  <th key={h} className={`py-2 pr-3 font-medium ${i > 0 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  {r.map((c, j) => (
                    <td key={j} className={`py-2.5 pr-3 ${j === 0 ? "font-medium" : "whitespace-nowrap text-right"}`}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ProfitTab({ data }: { data: AnalyticsData }) {
  const s = data.summary;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Revenue" value={formatINR(s.revenue)} icon={IndianRupee} tone="blue" />
        <StatCard label="Expenses" value={formatINR(data.totalExpenses)} icon={Receipt} tone="amber" />
        <StatCard label="Net profit" value={formatINR(s.profit)} icon={Percent} tone={s.profit >= 0 ? "green" : "purple"} hint={`${s.profitMargin}% margin`} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Revenue vs Expenses by Month" height={280} empty={data.monthlyProfit.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthlyProfit} margin={{ right: 16 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={axisLine} />
              <XAxis dataKey="month" tick={tick} stroke={axisLine} />
              <YAxis tick={tick} tickFormatter={compactINR} stroke={axisLine} />
              <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={tooltipStyle} formatter={(v) => formatINR(Number(v))} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={60} />
              <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Expenses by Category" height={280} empty={data.expenseByCategory.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.expenseByCategory} dataKey="amount" nameKey="category" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="none" label={({ name }) => name}>
                {data.expenseByCategory.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatINR(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <ListCard
        title="Profit by month"
        headers={["Month", "Revenue", "Expenses", "Profit"]}
        rows={data.monthlyProfit.map((m) => [m.month, formatINR(m.revenue), formatINR(m.expenses), formatINR(m.profit)])}
        empty="No sales or expenses in this period."
      />
    </div>
  );
}

export function BooksTab({ data }: { data: AnalyticsData }) {
  return (
    <div className="space-y-4">
      <ChartCard title="Top Books by Revenue" height={320} empty={data.topBooks.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.topBooks} layout="vertical" margin={{ left: 16, right: 16 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={axisLine} horizontal={false} />
            <XAxis type="number" tick={tick} tickFormatter={compactINR} stroke={axisLine} />
            <YAxis type="category" dataKey="name" tick={tick} width={190} stroke={axisLine} tickFormatter={(v: string) => (v.length > 26 ? v.slice(0, 25) + "…" : v)} />
            <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={tooltipStyle} formatter={(v) => [formatINR(Number(v)), "Revenue"]} />
            <Bar dataKey="revenue" fill="#2563eb" radius={[0, 6, 6, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <div className="grid gap-4 xl:grid-cols-2">
        <ListCard
          title="Not selling (dead stock)"
          headers={["Book", "Stock", "Value"]}
          rows={data.deadStock.map((b) => [b.name, b.stock, formatINR(b.value)])}
          empty="Every book in stock sold in this period."
        />
        <ListCard
          title="Running low"
          headers={["Book", "Stock", "Alert at"]}
          rows={data.lowStock.map((b) => [b.name, b.stock, b.alertAt])}
          empty="No books are below their stock alert."
        />
      </div>
    </div>
  );
}

export function CustomersTab({ data }: { data: AnalyticsData }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="New customers" value={String(data.newCustomers)} icon={UserPlus} tone="green" hint="added in this period" />
        <StatCard label="Buying customers" value={String(data.buyingCustomers)} icon={IndianRupee} tone="blue" hint="with invoices in this period" />
      </div>
      <ChartCard title="Top Customers by Revenue" height={320} empty={data.topCustomers.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.topCustomers} layout="vertical" margin={{ left: 16, right: 16 }}>
            <CartesianGrid strokeDasharray="2 4" stroke={axisLine} horizontal={false} />
            <XAxis type="number" tick={tick} tickFormatter={compactINR} stroke={axisLine} />
            <YAxis type="category" dataKey="name" tick={tick} width={150} stroke={axisLine} tickFormatter={(v: string) => (v.length > 20 ? v.slice(0, 19) + "…" : v)} />
            <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={tooltipStyle} formatter={(v) => [formatINR(Number(v)), "Revenue"]} />
            <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 6, 6, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ListCard
        title="Customer ranking"
        headers={["Customer", "Orders", "Revenue", "Still owes"]}
        rows={data.topCustomers.map((c) => [c.name, c.orders, formatINR(c.revenue), formatINR(c.due)])}
        empty="No invoices in this period."
      />
    </div>
  );
}

export function OperationsTab({ data }: { data: AnalyticsData }) {
  const o = data.operations;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Invoices" value={String(o.invoiceCount)} icon={Receipt} tone="blue" hint={`avg ${formatINR(o.avgOrder)}`} />
        <StatCard label="Collection rate" value={`${o.collectionRate}%`} icon={Percent} tone="green" hint="received of billed" />
        <StatCard label="Open print orders" value={String(o.openPrintOrders)} icon={Printer} tone="purple" hint={`${o.copiesOnOrder.toLocaleString("en-IN")} copies`} />
        <StatCard label="Outstanding" value={formatINR(data.summary.outstanding)} icon={Clock} tone="amber" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Payments Received by Month" height={260} empty={data.monthlyCollections.length === 0}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthlyCollections} margin={{ right: 16 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={axisLine} />
              <XAxis dataKey="month" tick={tick} stroke={axisLine} />
              <YAxis tick={tick} tickFormatter={compactINR} stroke={axisLine} />
              <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={tooltipStyle} formatter={(v) => [formatINR(Number(v)), "Received"]} />
              <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={80} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Unpaid Balance by Age (as of today)" height={260} empty={data.outstandingAging.every((b) => b.amount === 0)}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.outstandingAging} margin={{ right: 16 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={axisLine} />
              <XAxis dataKey="bucket" tick={tick} stroke={axisLine} />
              <YAxis tick={tick} tickFormatter={compactINR} stroke={axisLine} />
              <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={tooltipStyle} formatter={(v) => [formatINR(Number(v)), "Unpaid"]} />
              <Bar dataKey="amount" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={80} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
