import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "./index";
import { customers, invoiceItems, invoices, products } from "./schema";
import { daysAgo, today } from "../lib/date";

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function getDashboard() {
  const t = today();
  const monthStart = t.slice(0, 8) + "01";
  const start = daysAgo(13);

  const [[sales], [{ n: customerCount }], [{ n: productCount }], [{ n: lowStock }], trendRows, topRows] =
    await Promise.all([
      db
        .select({
          revenue: sql<number>`coalesce(sum(${invoices.total}), 0)`.mapWith(Number),
          orders: count(),
          todays: sql<number>`coalesce(sum(case when ${invoices.date} = ${t} then ${invoices.total} end), 0)`.mapWith(Number),
          monthly: sql<number>`coalesce(sum(case when ${invoices.date} >= ${monthStart} and ${invoices.date} <= ${t} then ${invoices.total} end), 0)`.mapWith(Number),
        })
        .from(invoices),
      db.select({ n: count() }).from(customers),
      db.select({ n: count() }).from(products),
      db
        .select({ n: count() })
        .from(products)
        .where(and(eq(products.status, "active"), sql`${products.stock} <= ${products.lowStockAt}`)),
      // Last 14 days; days with no sales are filled in below so the line has no gaps.
      db
        .select({ date: invoices.date, total: sql<number>`sum(${invoices.total})`.mapWith(Number) })
        .from(invoices)
        .where(and(gte(invoices.date, start), lte(invoices.date, t)))
        .groupBy(invoices.date),
      db
        .select({
          id: products.id,
          title: products.name,
          units: sql<number>`sum(${invoiceItems.quantity})`.mapWith(Number),
          revenue: sql<number>`sum(${invoiceItems.lineTotal})`.mapWith(Number),
        })
        .from(invoiceItems)
        .innerJoin(products, eq(products.id, invoiceItems.productId))
        .groupBy(products.id)
        .orderBy(desc(sql`sum(${invoiceItems.quantity})`))
        .limit(5),
    ]);

  const byDay = new Map(trendRows.map((r) => [r.date, r.total]));
  const salesTrend = Array.from({ length: 14 }, (_, i) => {
    const date = daysAgo(13 - i);
    return { date: date.slice(5), sales: round2(byDay.get(date) ?? 0) };
  });

  const topSellingBooks = topRows.map((r) => ({ ...r, revenue: round2(r.revenue) }));

  return {
    stats: {
      todaysSales: round2(sales.todays),
      monthlySales: round2(sales.monthly),
      totalRevenue: round2(sales.revenue),
      totalOrders: sales.orders,
      customers: customerCount,
      products: productCount,
      lowStock,
      avgOrder: sales.orders ? round2(sales.revenue / sales.orders) : 0,
    },
    salesTrend,
    topSellingBooks,
  };
}
