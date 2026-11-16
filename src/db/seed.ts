// Sample data so a fresh database isn't empty.
//   npm run db:seed    -> inserts sample data (refuses if the database already has data)
//   npm run db:reset   -> wipes every table, then inserts sample data
import "./load-env"; // must come first: reads .env before the database connection is made
import { sql } from "drizzle-orm";
import { db, sql as pg } from "./index";
import { deleteImage } from "../lib/imagekit";
import {
  authors, categories, company, customers, expenses, invoiceItems, invoices, printOrders, printingPresses,
  productImages, products, stockMovements,
} from "./schema";

const reset = process.argv.includes("--reset");

async function main() {
  if (reset) {
    // Remove the photos from ImageKit too, so nothing is left orphaned there.
    const photos = await db.select({ fileId: productImages.fileId }).from(productImages);
    await Promise.allSettled(photos.map((p) => deleteImage(p.fileId)));
    // One statement empties every table and restarts the ids from 1.
    await db.execute(sql`truncate table
      audit_logs, print_orders, printing_presses, royalty_payments, payments, stock_movements, product_images,
      quotation_items, quotations,
      invoice_items, invoices, expenses, products, customers, authors, categories, company
      restart identity cascade`);
  } else {
    const [[c], [p]] = await Promise.all([
      db.select({ id: categories.id }).from(categories).limit(1),
      db.select({ id: products.id }).from(products).limit(1),
    ]);
    if (c || p) {
      console.log("Database already has data. Use `npm run db:reset` to wipe it and re-seed.");
      return;
    }
  }

  const day = "2026-09-18";

  const [cat] = await db
    .insert(categories)
    .values({ name: "MPPSC (Mains)", description: "Books for the MPPSC Mains exam", createdAt: day })
    .returning();

  const [author] = await db
    .insert(authors)
    .values({
      name: "MR. Mayank Sharma",
      mobile: "9179928113",
      email: "hindibymayanksharma@gmail.com",
      royaltyPercent: 10,
      createdAt: day,
    })
    .returning();

  const [customer] = await db
    .insert(customers)
    .values({
      name: "Champion square",
      mobile: "09039030348",
      email: "championsquare21@gmail.com",
      city: "Indore",
      gstin: "",
      address: "Near Vishnupuri i-Bus Stop, Bhanwarkua, Indore (MP)",
      state: "Madhyapradesh",
      pincode: "452001",
      createdAt: day,
    })
    .returning();

  const [nibandh, hindi] = await db
    .insert(products)
    .values([
      {
        name: "Nibandh Sanhita And Prarup Chandrika", authorId: author.id, categoryId: cat.id,
        sku: "02", isbn: "9789357011297", price: 380, mrp: 380, gst: 0, stock: 0, lowStockAt: 10,
        status: "active", createdAt: day,
        description: "A complete guide to essay writing and formal letter formats for the MPPSC Mains Hindi paper, with model essays and practice topics.",
        highlights: "Essay writing techniques with model essays\nFormal letter and application formats (prarup)\nPractice topics based on past papers",
        publisher: "Devanagari Prakashan", language: "Hindi", edition: "1st edition", pages: 320, binding: "Paperback", weightGrams: 420, tags: "essay, mppsc, mains, hindi",
      },
      {
        name: "Samanya Hindi Evam Vyakaran", authorId: author.id, categoryId: cat.id,
        sku: "01", isbn: "9788198142221", price: 430, mrp: 430, gst: 0, stock: 0, lowStockAt: 10,
        status: "active", createdAt: day,
        description: "General Hindi and grammar (vyakaran) for the MPPSC Mains, covering the full syllabus with solved examples.",
        highlights: "Full syllabus coverage\nSolved examples and exercises",
        publisher: "Devanagari Prakashan", language: "Hindi", edition: "1st edition", pages: 400, binding: "Paperback", weightGrams: 480, tags: "hindi, grammar, mppsc, mains",
      },
    ])
    .returning();

  // Opening stock goes through the stock history like any other change.
  await db.insert(stockMovements).values([
    { productId: nibandh.id, type: "adjustment", quantity: 100, balance: 100, note: "Opening stock", date: day, createdAt: day },
    { productId: hindi.id, type: "adjustment", quantity: 2100, balance: 2100, note: "Opening stock", date: day, createdAt: day },
  ]);

  const [invoice] = await db
    .insert(invoices)
    .values({
      number: "DP-01000", customerId: customer.id, date: day, total: 19035, paidAmount: 0,
      paymentMode: "bank", createdAt: day,
    })
    .returning();

  await db.insert(invoiceItems).values([
    { invoiceId: invoice.id, productId: nibandh.id, quantity: 50, rate: 380, discountPercent: 53, gstPercent: 0, unitPrice: 178.6, lineTotal: 8930 },
    { invoiceId: invoice.id, productId: hindi.id, quantity: 50, rate: 430, discountPercent: 53, gstPercent: 0, unitPrice: 202.1, lineTotal: 10105 },
  ]);
  await db.insert(stockMovements).values([
    { productId: nibandh.id, type: "sale", quantity: -50, balance: 50, note: "Invoice DP-01000", date: day, createdAt: day },
    { productId: hindi.id, type: "sale", quantity: -50, balance: 2050, note: "Invoice DP-01000", date: day, createdAt: day },
  ]);
  await db.update(products).set({ stock: 50 }).where(sql`${products.id} = ${nibandh.id}`);
  await db.update(products).set({ stock: 2050 }).where(sql`${products.id} = ${hindi.id}`);

  await db
    .insert(expenses)
    .values({ description: "Printing cost", amount: 55000, date: "2026-09-15", createdAt: day });

  // Printed on every invoice. Check these details and correct them for your business.
  await db.insert(company).values({
    id: 1,
    name: "Devanagari Prakashan LLP",
    address: "B2, Palash Parisar, Phase 1 Rau, Indore PinCode : 452012",
    phone: "9179928113",
    email: "devanagariprakashan@gmail.com",
    gstin: "23AAWFD7784Q1Z9",
    terms: "Books once sold will not be taken back. E&OE.",
    upiId: "",
    invoicePrefix: "DP-",
  });

  console.log("Seeded sample data.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pg.end());
