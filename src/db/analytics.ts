import { and, between, count, desc, eq, gt, notInArray, sql } from "drizzle-orm";
import { db } from "./index";
import { row, rows } from "./raw";
import { categories, expenses, invoiceItems, invoices, products } from "./schema";
import { today } from "../lib/date";

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Everything on the Analytics page for invoices dated from..to (inclusive, yyyy-mm-dd). */
export async function getAnalytics(from: string, to: string) {
  const inRange = between(invoices.date, from, to);

  // Stock that is on the shelf but did not sell at all in this period.
  const soldIds = db
    .select({ id: invoiceItems.productId })
    .from(invoiceItems)
    .innerJoin(invoices, eq(invoices.id, invoiceItems.invoiceId))
    .where(inRange);

  const month = sql<string>`substr(${invoices.date}, 1, 7)`;

  const [
    [sales],
    [{ total: spent }],
    [{ v: deadStockValueRaw }],
    paymentModeRows,
    categoryRows,
    monthlyUnitsSold,
    orderCounts,
    monthlyRevenueRows,
    monthlyExpenseRows,
    expenseCategoryRows,
    topBookRows,
    deadStockRows,
    lowStock,
    topCustomerRows,
    buyingRow,
    newRow,
    invoiceStats,
    collectionRows,
    agingRows,
    printing,
  ] = await Promise.all([
    db
      .select({
        revenue: sql<number>`coalesce(sum(${invoices.total} - ${invoices.creditedAmount}), 0)`.mapWith(Number),
        outstanding: sql<number>`coalesce(sum(${invoices.total} - ${invoices.creditedAmount} - ${invoices.paidAmount}), 0)`.mapWith(Number),
      })
      .from(invoices)
      .where(inRange),
    db
      .select({ total: sql<number>`coalesce(sum(${expenses.amount}), 0)`.mapWith(Number) })
      .from(expenses)
      .where(between(expenses.date, from, to)),
    db
      .select({ v: sql<number>`coalesce(sum(${products.stock} * ${products.price}), 0)`.mapWith(Number) })
      .from(products)
      .where(and(gt(products.stock, 0), notInArray(products.id, soldIds))),
    db
      .select({ name: invoices.paymentMode, value: sql<number>`sum(${invoices.total} - ${invoices.creditedAmount})`.mapWith(Number) })
      .from(invoices)
      .where(inRange)
      .groupBy(invoices.paymentMode),
    db
      .select({ category: categories.name, revenue: sql<number>`sum(${invoiceItems.lineTotal})`.mapWith(Number) })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoices.id, invoiceItems.invoiceId))
      .innerJoin(products, eq(products.id, invoiceItems.productId))
      .innerJoin(categories, eq(categories.id, products.categoryId))
      .where(inRange)
      .groupBy(categories.id)
      .orderBy(desc(sql`sum(${invoiceItems.lineTotal})`)),
    db
      .select({ month, units: sql<number>`sum(${invoiceItems.quantity})`.mapWith(Number) })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoices.id, invoiceItems.invoiceId))
      .where(inRange)
      .groupBy(month)
      .orderBy(month),
    // How many customers placed 1, 2, 3-5, 6+ orders in this period.
    db.select({ n: count() }).from(invoices).where(inRange).groupBy(invoices.customerId),

    // ---------- Profit tab ----------
    rows<{ m: string; v: number }>(
      sql`select substr(date, 1, 7) as m, sum(total - credited_amount)::float8 as v from invoices where date between ${from} and ${to} group by 1`
    ),
    rows<{ m: string; v: number }>(
      sql`select substr(date, 1, 7) as m, sum(amount)::float8 as v from expenses where date between ${from} and ${to} group by 1`
    ),
    rows<{ category: string; amount: number }>(
      sql`select category, sum(amount)::float8 as amount from expenses where date between ${from} and ${to} group by category order by 2 desc`
    ),

    // ---------- Books tab ----------
    rows<{ name: string; units: number; revenue: number }>(sql`
      select p.name as name, sum(ii.quantity)::int as units, sum(ii.line_total)::float8 as revenue
      from invoice_items ii join invoices i on i.id = ii.invoice_id join products p on p.id = ii.product_id
      where i.date between ${from} and ${to}
      group by p.id order by 3 desc limit 10`),
    rows<{ name: string; stock: number; value: number }>(sql`
      select name, stock, (stock * price)::float8 as value from products
      where stock > 0 and id not in (
        select ii.product_id from invoice_items ii join invoices i on i.id = ii.invoice_id
        where i.date between ${from} and ${to})
      order by 3 desc limit 10`),
    rows<{ name: string; stock: number; alertAt: number }>(sql`
      select name, stock, low_stock_at as "alertAt" from products
      where status = 'active' and stock <= low_stock_at order by stock limit 10`),

    // ---------- Customers tab ----------
    rows<{ name: string; orders: number; revenue: number; due: number }>(sql`
      select c.name as name, count(*)::int as orders, sum(i.total - i.credited_amount)::float8 as revenue, sum(i.total - i.credited_amount - i.paid_amount)::float8 as due
      from invoices i join customers c on c.id = i.customer_id
      where i.date between ${from} and ${to}
      group by c.id order by 3 desc limit 10`),
    row<{ n: number }>(
      sql`select count(distinct customer_id)::int as n from invoices where date between ${from} and ${to}`
    ),
    row<{ n: number }>(sql`select count(*)::int as n from customers where created_at between ${from} and ${to}`),

    // ---------- Operations tab ----------
    row<{ n: number; total: number; paid: number }>(
      sql`select count(*)::int as n, coalesce(sum(total - credited_amount), 0)::float8 as total, coalesce(sum(paid_amount), 0)::float8 as paid from invoices where date between ${from} and ${to}`
    ),
    rows<{ month: string; amount: number }>(
      sql`select substr(date, 1, 7) as month, sum(amount)::float8 as amount from payments where date between ${from} and ${to} group by 1 order by 1`
    ),
    // Unpaid balance by how old the invoice is, as of today.
    rows<{ age: number; due: number }>(
      sql`select (${today()}::date - date::date)::int as age, (total - credited_amount - paid_amount)::float8 as due from invoices where total - credited_amount - paid_amount > 0.004`
    ),
    row<{ orders: number; copies: number }>(
      sql`select count(*)::int as orders, coalesce(sum(quantity), 0)::int as copies from print_orders where status in ('ordered', 'printing')`
    ),
  ]);

  const revenue = round2(sales.revenue);
  const profit = round2(sales.revenue - spent);
  const deadStockValue = round2(deadStockValueRaw);

  const paymentModeSplit = paymentModeRows.map((r) => ({ ...r, value: round2(r.value) }));
  const categoryRevenue = categoryRows.map((r) => ({ ...r, revenue: round2(r.revenue) }));

  const cohort = { "1 order": 0, "2 orders": 0, "3-5 orders": 0, "6+ orders": 0 };
  for (const { n } of orderCounts) {
    if (n === 1) cohort["1 order"]++;
    else if (n === 2) cohort["2 orders"]++;
    else if (n <= 5) cohort["3-5 orders"]++;
    else cohort["6+ orders"]++;
  }
  const repeatCustomerCohort = Object.entries(cohort).map(([bucket, customers]) => ({ bucket, customers }));

  const monthlyMap = new Map<string, { month: string; revenue: number; expenses: number; profit: number }>();
  const slot = (m: string) => {
    let s = monthlyMap.get(m);
    if (!s) monthlyMap.set(m, (s = { month: m, revenue: 0, expenses: 0, profit: 0 }));
    return s;
  };
  for (const r of monthlyRevenueRows) slot(r.m).revenue = round2(r.v);
  for (const r of monthlyExpenseRows) slot(r.m).expenses = round2(r.v);
  const monthlyProfit = [...monthlyMap.values()]
    .map((s) => ({ ...s, profit: round2(s.revenue - s.expenses) }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const expenseByCategory = expenseCategoryRows.map((r) => ({ ...r, amount: round2(r.amount) }));
  const topBooks = topBookRows.map((r) => ({ ...r, revenue: round2(r.revenue) }));
  const deadStock = deadStockRows.map((r) => ({ ...r, value: round2(r.value) }));
  const topCustomers = topCustomerRows.map((r) => ({ ...r, revenue: round2(r.revenue), due: round2(Math.max(r.due, 0)) }));
  const monthlyCollections = collectionRows.map((r) => ({ ...r, amount: round2(r.amount) }));

  const aging = { "0-30 days": 0, "31-60 days": 0, "61-90 days": 0, "90+ days": 0 };
  for (const r of agingRows) {
    if (r.age <= 30) aging["0-30 days"] += r.due;
    else if (r.age <= 60) aging["31-60 days"] += r.due;
    else if (r.age <= 90) aging["61-90 days"] += r.due;
    else aging["90+ days"] += r.due;
  }
  const outstandingAging = Object.entries(aging).map(([bucket, amount]) => ({ bucket, amount: round2(amount) }));

  return {
    summary: {
      revenue,
      profit,
      profitMargin: revenue > 0 ? round2((profit / revenue) * 100) : 0,
      outstanding: round2(sales.outstanding),
      deadStockValue,
    },
    paymentModeSplit,
    categoryRevenue,
    monthlyUnitsSold,
    repeatCustomerCohort,
    monthlyProfit,
    expenseByCategory,
    totalExpenses: round2(spent),
    topBooks,
    deadStock,
    lowStock,
    topCustomers,
    newCustomers: newRow.n,
    buyingCustomers: buyingRow.n,
    operations: {
      invoiceCount: invoiceStats.n,
      avgOrder: invoiceStats.n > 0 ? round2(invoiceStats.total / invoiceStats.n) : 0,
      collectionRate: invoiceStats.total > 0 ? round2((invoiceStats.paid / invoiceStats.total) * 100) : 0,
      openPrintOrders: printing.orders,
      copiesOnOrder: printing.copies,
    },
    monthlyCollections,
    outstandingAging,
  };
}

export type AnalyticsData = Awaited<ReturnType<typeof getAnalytics>>;
