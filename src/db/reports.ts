import { sql } from "drizzle-orm";
import { rows as query } from "./raw";

const round2 = (n: number) => Math.round(n * 100) / 100;

export type ColType = "text" | "number" | "money" | "date";
export interface Column {
  key: string;
  label: string;
  type: ColType;
}
export type Cell = string | number;
export interface Report {
  title: string;
  description: string;
  /** false for "as of today" reports where the date range doesn't apply */
  usesRange: boolean;
  columns: Column[];
  rows: Record<string, Cell>[];
  /** Sum row, for the numeric columns that make sense to add up. */
  totals?: Record<string, Cell>;
}

export const REPORT_TYPES = {
  sales: "Sales register",
  gst: "GST summary",
  bestsellers: "Best-selling books",
  outstanding: "Outstanding by customer",
  stock: "Stock valuation",
  expenses: "Expenses",
  royalty: "Author royalty",
} as const;
export type ReportType = keyof typeof REPORT_TYPES;
export const isReportType = (v: string): v is ReportType => v in REPORT_TYPES;

const sum = (rows: Record<string, Cell>[], key: string) => round2(rows.reduce((s, r) => s + Number(r[key] ?? 0), 0));

export async function getReport(type: ReportType, from: string, to: string): Promise<Report> {
  switch (type) {
    case "sales": {
      const rows = await query<{
        date: string; number: string; customer: string; subtotal: number; gst: number; total: number; credited: number; received: number;
      }>(sql`
        select i.date as date, i.number as number, c.name as customer,
          coalesce((select sum(line_total) from invoice_items where invoice_id = i.id), 0)::float8 as subtotal,
          coalesce((select sum(line_total * gst_percent / 100) from invoice_items where invoice_id = i.id), 0)::float8 as gst,
          i.total as total, i.credited_amount as credited, i.paid_amount as received
        from invoices i join customers c on c.id = i.customer_id
        where i.date between ${from} and ${to}
        order by i.date, i.id`);
      const data = rows.map((r) => ({ ...r, subtotal: round2(r.subtotal), gst: round2(r.gst), credited: round2(r.credited), balance: round2(r.total - r.credited - r.received) }));
      return {
        title: REPORT_TYPES.sales,
        description: "Every invoice in the period, with GST and what is still unpaid.",
        usesRange: true,
        columns: [
          { key: "date", label: "Date", type: "date" },
          { key: "number", label: "Invoice", type: "text" },
          { key: "customer", label: "Customer", type: "text" },
          { key: "subtotal", label: "Subtotal", type: "money" },
          { key: "gst", label: "GST", type: "money" },
          { key: "total", label: "Total", type: "money" },
          { key: "credited", label: "Credit notes", type: "money" },
          { key: "received", label: "Received", type: "money" },
          { key: "balance", label: "Balance", type: "money" },
        ],
        rows: data,
        totals: {
          subtotal: sum(data, "subtotal"), gst: sum(data, "gst"), total: sum(data, "total"), credited: sum(data, "credited"),
          received: sum(data, "received"), balance: sum(data, "balance"),
        },
      };
    }

    case "gst": {
      const rows = (await query<{ rate: number; taxable: number; gst: number }>(sql`
          select ii.gst_percent as rate, sum(ii.line_total)::float8 as taxable, sum(ii.line_total * ii.gst_percent / 100)::float8 as gst
          from invoice_items ii join invoices i on i.id = ii.invoice_id
          where i.date between ${from} and ${to}
          group by ii.gst_percent order by ii.gst_percent`))
        .map((r) => ({ rate: `${r.rate}%`, taxable: round2(r.taxable), gst: round2(r.gst), total: round2(r.taxable + r.gst) }));
      return {
        title: REPORT_TYPES.gst,
        description: "Taxable value and GST collected, grouped by GST rate. Use it for your GST return.",
        usesRange: true,
        columns: [
          { key: "rate", label: "GST rate", type: "text" },
          { key: "taxable", label: "Taxable value", type: "money" },
          { key: "gst", label: "GST amount", type: "money" },
          { key: "total", label: "Total", type: "money" },
        ],
        rows,
        totals: { taxable: sum(rows, "taxable"), gst: sum(rows, "gst"), total: sum(rows, "total") },
      };
    }

    case "bestsellers": {
      const rows = (await query<{ name: string; sku: string; units: number; revenue: number }>(sql`
          select p.name as name, p.sku as sku, sum(ii.quantity)::int as units, sum(ii.line_total)::float8 as revenue
          from invoice_items ii join invoices i on i.id = ii.invoice_id join products p on p.id = ii.product_id
          where i.date between ${from} and ${to}
          group by p.id order by 3 desc, 4 desc`))
        .map((r) => ({ ...r, revenue: round2(r.revenue) }));
      return {
        title: REPORT_TYPES.bestsellers,
        description: "Books ranked by copies sold in the period.",
        usesRange: true,
        columns: [
          { key: "name", label: "Book", type: "text" },
          { key: "sku", label: "SKU", type: "text" },
          { key: "units", label: "Copies sold", type: "number" },
          { key: "revenue", label: "Revenue (before GST)", type: "money" },
        ],
        rows,
        totals: { units: sum(rows, "units"), revenue: sum(rows, "revenue") },
      };
    }

    case "outstanding": {
      const rows = (await query<{ customer: string; mobile: string; invoices: number; total: number; received: number; oldest: string }>(sql`
          select c.name as customer, c.mobile as mobile, count(*)::int as invoices, sum(i.total - i.credited_amount)::float8 as total,
            sum(i.paid_amount)::float8 as received, min(i.date) as oldest
          from invoices i join customers c on c.id = i.customer_id
          where i.total - i.credited_amount - i.paid_amount > 0.004
          group by c.id order by sum(i.total - i.credited_amount - i.paid_amount) desc`))
        .map((r) => ({ ...r, total: round2(r.total), received: round2(r.received), due: round2(r.total - r.received) }));
      return {
        title: REPORT_TYPES.outstanding,
        description: "Customers who still owe money, as of today. The date range doesn't apply.",
        usesRange: false,
        columns: [
          { key: "customer", label: "Customer", type: "text" },
          { key: "mobile", label: "Mobile", type: "text" },
          { key: "invoices", label: "Open invoices", type: "number" },
          { key: "oldest", label: "Oldest invoice", type: "date" },
          { key: "total", label: "Billed", type: "money" },
          { key: "received", label: "Received", type: "money" },
          { key: "due", label: "Due", type: "money" },
        ],
        rows,
        totals: { invoices: sum(rows, "invoices"), total: sum(rows, "total"), received: sum(rows, "received"), due: sum(rows, "due") },
      };
    }

    case "stock": {
      const rows = (await query<{ name: string; sku: string; category: string; stock: number; price: number }>(sql`
          select p.name as name, p.sku as sku, c.name as category, p.stock as stock, p.price as price
          from products p join categories c on c.id = p.category_id order by p.name`))
        .map((r) => ({ ...r, value: round2(r.stock * r.price) }));
      return {
        title: REPORT_TYPES.stock,
        description: "Current stock valued at selling price, as of today. The date range doesn't apply.",
        usesRange: false,
        columns: [
          { key: "name", label: "Book", type: "text" },
          { key: "sku", label: "SKU", type: "text" },
          { key: "category", label: "Category", type: "text" },
          { key: "stock", label: "Stock", type: "number" },
          { key: "price", label: "Price", type: "money" },
          { key: "value", label: "Value", type: "money" },
        ],
        rows,
        totals: { stock: sum(rows, "stock"), value: sum(rows, "value") },
      };
    }

    case "expenses": {
      const rows = await query<{ date: string; description: string; category: string; amount: number }>(sql`
        select date, description, category, amount from expenses
        where date between ${from} and ${to} order by date, id`);
      return {
        title: REPORT_TYPES.expenses,
        description: "Every expense in the period.",
        usesRange: true,
        columns: [
          { key: "date", label: "Date", type: "date" },
          { key: "description", label: "Description", type: "text" },
          { key: "category", label: "Category", type: "text" },
          { key: "amount", label: "Amount", type: "money" },
        ],
        rows,
        totals: { amount: sum(rows, "amount") },
      };
    }

    case "royalty": {
      const rows = (await query<{ author: string; percent: number; units: number; sales: number }>(sql`
          select a.name as author, a.royalty_percent as percent,
            coalesce((select sum(ii.quantity)::int from invoice_items ii
              join invoices i on i.id = ii.invoice_id join products p on p.id = ii.product_id
              where p.author_id = a.id and i.date between ${from} and ${to}), 0) as units,
            coalesce((select sum(ii.line_total)::float8 from invoice_items ii
              join invoices i on i.id = ii.invoice_id join products p on p.id = ii.product_id
              where p.author_id = a.id and i.date between ${from} and ${to}), 0) as sales
          from authors a order by a.name`))
        .map((r) => ({ ...r, percent: `${r.percent}%`, sales: round2(r.sales), royalty: round2((r.sales * r.percent) / 100) }));
      return {
        title: REPORT_TYPES.royalty,
        description: "Royalty earned by each author on sales in the period (before GST).",
        usesRange: true,
        columns: [
          { key: "author", label: "Author", type: "text" },
          { key: "percent", label: "Rate", type: "text" },
          { key: "units", label: "Copies sold", type: "number" },
          { key: "sales", label: "Sales", type: "money" },
          { key: "royalty", label: "Royalty earned", type: "money" },
        ],
        rows,
        totals: { units: sum(rows, "units"), sales: sum(rows, "sales"), royalty: sum(rows, "royalty") },
      };
    }
  }
}
