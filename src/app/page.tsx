import Link from "next/link";
import { IndianRupee, Users, BookOpen, TrendingUp, ShoppingCart, AlertTriangle } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import SalesTrend from "@/components/dashboard/SalesTrend";
import TopSellingBooks from "@/components/dashboard/TopSellingBooks";
import { getDashboard } from "@/db/dashboard";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { stats, salesTrend, topSellingBooks } = await getDashboard();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.15em] text-muted-foreground">Overview</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Dashboard</h1>
        </div>
        <Link
          href="/invoices/new"
          className="flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-base font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
        >
          <IndianRupee className="h-5 w-5" />
          New Invoice
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's Sales" value={formatINR(stats.todaysSales)} icon={TrendingUp} tone="blue" />
        <StatCard label="Monthly Sales" value={formatINR(stats.monthlySales)} icon={IndianRupee} tone="green" />
        <StatCard label="Total Revenue" value={formatINR(stats.totalRevenue)} icon={TrendingUp} tone="purple" />
        <StatCard label="Total Orders" value={String(stats.totalOrders)} icon={ShoppingCart} tone="amber" />
        <StatCard label="Customers" value={String(stats.customers)} icon={Users} tone="blue" />
        <StatCard label="Products" value={String(stats.products)} icon={BookOpen} tone="green" />
        <StatCard
          label="Low Stock"
          value={String(stats.lowStock)}
          icon={AlertTriangle}
          tone="amber"
          hint={stats.lowStock === 0 ? "All good" : "Needs restocking"}
        />
        <StatCard label="Avg Order" value={formatINR(stats.avgOrder)} icon={TrendingUp} tone="purple" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_452px]">
        <SalesTrend data={salesTrend} />
        <TopSellingBooks books={topSellingBooks} />
      </div>
    </div>
  );
}
