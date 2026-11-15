"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { Field, inputCls } from "@/components/ui/Field";
import BookCover from "./BookCover";
import { createProduct, deleteProductImage, setCoverImage, updateProduct } from "@/app/products/actions";
import { discountPercent, productImageUrl } from "@/lib/media";
import {
  BINDINGS, FORM_ERROR, LANGUAGES, MAX_HIGHLIGHTS, parseProduct, type FieldErrors, type ProductRaw,
} from "@/lib/validation";

interface Option {
  id: number;
  name: string;
}

interface Props {
  /** Present when editing; absent when adding a new book. */
  productId?: number;
  initial: ProductRaw;
  categories: Option[];
  authors: Option[];
  images?: { id: number; path: string }[];
}

const MAX_IMAGES = 8;
const MAX_BYTES = 5 * 1024 * 1024;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const MAX_ORIGINAL_BYTES = 40 * 1024 * 1024; // what we're willing to read from the user's disk
const MAX_SIDE = 2400; // longest edge after shrinking; plenty for a product page

/** Uploads one photo. Returns the error messages (empty when it worked). */
async function uploadImage(productId: number, file: File): Promise<string[]> {
  const body = new FormData();
  body.append("files", file);
  try {
    const res = await fetch(`/api/products/${productId}/images`, { method: "POST", body });
    const data = (await res.json().catch(() => null)) as { errors?: string[] } | null;
    if (data?.errors?.length) return data.errors;
    return res.ok ? [] : [`${file.name}: upload failed`];
  } catch {
    return [`${file.name}: upload failed, check your connection`];
  }
}

/** Phone photos are often 5-12 MB. Scale them down and re-encode so they upload quickly and fit the limit. */
async function shrink(file: File): Promise<File> {
  if (file.type === "image/gif") return file; // keep animation
  try {
    const bmp = await createImageBitmap(file); // also applies the photo's rotation
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size <= 1.5 * 1024 * 1024) {
      bmp.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff"; // JPEG has no transparency
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file; // the browser couldn't decode it; the server will judge it
  }
}

const card = "rounded-2xl border border-border bg-card p-6 shadow-sm";

export default function ProductEditor({ productId, initial, categories, authors, images = [] }: Props) {
  const router = useRouter();
  const isEdit = productId !== undefined;
  const [v, setV] = useState<ProductRaw>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();

  // New book: photos are chosen now and uploaded right after the book is saved.
  const [queued, setQueued] = useState<File[]>([]);
  const previews = useMemo(() => queued.map((f) => URL.createObjectURL(f)), [queued]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);
  const [photoMsg, setPhotoMsg] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [dragging, setDragging] = useState(false);

  const set = (key: keyof ProductRaw, value: string) => setV((cur) => ({ ...cur, [key]: value }));
  const price = Number(v.price);
  const mrp = v.mrp.trim() === "" ? price : Number(v.mrp);
  const off = Number.isFinite(price) && Number.isFinite(mrp) ? discountPercent(price, mrp) : 0;

  const text = (key: keyof ProductRaw, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Field label={label} error={errors[key]}>
      <input {...props} value={v[key]} onChange={(e) => set(key, e.target.value)} className={inputCls(errors[key])} />
    </Field>
  );
  const select = (key: keyof ProductRaw, label: string, options: { value: string; label: string }[]) => (
    <Field label={label} error={errors[key]}>
      <select value={v[key]} onChange={(e) => set(key, e.target.value)} className={inputCls(errors[key])}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
  const withCurrent = (list: readonly string[], current: string) =>
    (list.includes(current) || !current ? [...list] : [...list, current]).map((x) => ({ value: x, label: x }));

  /** Checks picked files (shrinking big ones) and returns the acceptable ones, with a message for each rejected one. */
  const screen = async (files: File[], alreadyHave: number) => {
    const ok: File[] = [];
    const msgs: string[] = [];
    for (const f of files) {
      if (!OK_TYPES.includes(f.type)) msgs.push(`${f.name}: only JPG, PNG, WebP or GIF`);
      else if (alreadyHave + ok.length >= MAX_IMAGES) msgs.push(`${f.name}: at most ${MAX_IMAGES} photos per book`);
      else if (f.size > MAX_ORIGINAL_BYTES) msgs.push(`${f.name}: file is too large`);
      else {
        setStatus(`Preparing ${f.name}...`);
        const small = await shrink(f);
        if (small.size > MAX_BYTES) msgs.push(`${f.name}: still larger than 5 MB after shrinking`);
        else ok.push(small);
      }
    }
    return { ok, msgs };
  };

  const pickFiles = async (list: FileList | File[] | null) => {
    if (busy || !list || list.length === 0) return;
    const files = Array.from(list);
    setBusy(true);
    setPhotoMsg([]);
    try {
      const { ok, msgs } = await screen(files, isEdit ? images.length : queued.length);
      const problems = [...msgs];
      if (!isEdit) {
        setQueued((q) => [...q, ...ok]);
      } else {
        // One photo per request: one bad file can't sink the others, and each request stays small.
        for (let i = 0; i < ok.length; i++) {
          setStatus(`Uploading ${i + 1} of ${ok.length}...`);
          problems.push(...(await uploadImage(productId, ok[i])));
          router.refresh();
        }
      }
      setPhotoMsg(problems);
    } finally {
      setBusy(false);
      setStatus("");
    }
  };

  const act = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const { errors: local } = parseProduct(v);
    setErrors(local);
    if (Object.keys(local).length) {
      // Wait for the error messages to render, then bring the first one into view.
      setTimeout(() => document.querySelector("p.text-red-500")?.scrollIntoView({ block: "center" }), 0);
      return;
    }
    startTransition(async () => {
      if (isEdit) {
        const res = await updateProduct(productId, v);
        if (!res.ok) return setErrors(res.errors);
        router.push(`/products/${productId}`);
        router.refresh();
        return;
      }
      const res = await createProduct(v);
      if (!res.ok) return setErrors(res.errors);
      if (queued.length) {
        const problems: string[] = [];
        for (let i = 0; i < queued.length; i++) {
          setStatus(`Uploading photo ${i + 1} of ${queued.length}...`);
          problems.push(...(await uploadImage(res.id, queued[i])));
        }
        setStatus("");
        if (problems.length) {
          router.push(`/products/${res.id}/edit`); // book is saved; let the user retry the photos there
          return;
        }
      }
      router.push(`/products/${res.id}`);
      router.refresh();
    });
  };

  const highlightCount = v.highlights.split("\n").filter((l) => l.trim()).length;

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <section className={card}>
        <h2 className="text-lg font-semibold">Basic information</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">{text("name", "Title *", { autoFocus: true, placeholder: "Book title" })}</div>
          {select("authorId", "Author", [
            { value: "", label: "No author" },
            ...authors.map((a) => ({ value: String(a.id), label: a.name })),
          ])}
          {select(
            "categoryId",
            "Category *",
            categories.length ? categories.map((c) => ({ value: String(c.id), label: c.name })) : [{ value: "", label: "Add a category first" }]
          )}
          {text("publisher", "Publisher", { placeholder: "e.g. Devanagari Prakashan" })}
          {text("edition", "Edition", { placeholder: "e.g. 3rd edition, 2026" })}
        </div>
      </section>

      <section className={card}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pricing &amp; tax</h2>
          {off > 0 && (
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              {off}% off MRP
            </span>
          )}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {text("price", "Selling price (₹) *", { inputMode: "decimal", placeholder: "0.00" })}
          {text("mrp", "MRP (₹)", { inputMode: "decimal", placeholder: "Same as price" })}
          {text("gst", "GST (%)", { inputMode: "decimal" })}
        </div>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Inventory</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {text("sku", "SKU *", { placeholder: "e.g. 03" })}
          {text("isbn", "ISBN (13 digits)", { inputMode: "numeric", maxLength: 13, placeholder: "Optional, makes a barcode" })}
          {select("status", "Status", [
            { value: "active", label: "Active (can be invoiced)" },
            { value: "inactive", label: "Inactive (hidden from invoices)" },
          ])}
          {text("stock", isEdit ? "Stock on hand" : "Opening stock", { inputMode: "numeric" })}
          {text("lowStockAt", "Low-stock alert at", { inputMode: "numeric" })}
        </div>
        {isEdit && (
          <p className="mt-3 text-sm text-muted-foreground">
            Changing the stock here is logged as an adjustment. For purchases and corrections with a note, use Inventory.
          </p>
        )}
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Book details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {select("language", "Language", withCurrent(LANGUAGES, v.language))}
          {select("binding", "Binding", withCurrent(BINDINGS, v.binding))}
          {text("pages", "Pages", { inputMode: "numeric" })}
          {text("weightGrams", "Weight (grams)", { inputMode: "numeric" })}
          <div className="sm:col-span-2 lg:col-span-4">
            {text("tags", "Tags", { placeholder: "Comma separated, e.g. essay, mains, hindi" })}
          </div>
        </div>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Description</h2>
        <div className="mt-4 space-y-4">
          <Field label="About this book" error={errors.description}>
            <textarea
              rows={6}
              value={v.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What the book covers, who it is for, what makes it useful..."
              className={inputCls(errors.description).replace("h-11", "py-2")}
            />
          </Field>
          <Field label={`Highlights (one per line, up to ${MAX_HIGHLIGHTS}) · ${highlightCount} added`} error={errors.highlights}>
            <textarea
              rows={4}
              value={v.highlights}
              onChange={(e) => set("highlights", e.target.value)}
              placeholder={"Covers the complete MPPSC Mains syllabus\nPrevious years' questions included"}
              className={inputCls(errors.highlights).replace("h-11", "py-2")}
            />
          </Field>
        </div>
      </section>

      <section className={card}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Photos</h2>
          <span className="text-sm text-muted-foreground">
            {isEdit ? images.length : queued.length} of {MAX_IMAGES} · first photo is the cover
          </span>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void pickFiles(e.dataTransfer.files);
          }}
          className={`mt-4 grid grid-cols-2 gap-4 rounded-xl sm:grid-cols-4 lg:grid-cols-6 ${dragging ? "bg-primary/5 ring-2 ring-primary/40" : ""}`}
        >
          {isEdit &&
            images.map((img, i) => (
              <div key={img.id} className="group relative">
                <div className="aspect-[3/4] overflow-hidden rounded-lg border border-border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={productImageUrl(img.path, 300)} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                </div>
                {i === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    Cover
                  </span>
                )}
                <div className="mt-2 flex justify-between">
                  {i === 0 ? (
                    <span />
                  ) : (
                    <button
                      type="button"
                      onClick={() => act(() => setCoverImage(img.id))}
                      className="flex items-center gap-1 rounded-md px-1.5 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Star className="h-4 w-4" />
                      Make cover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => act(() => deleteProductImage(img.id))}
                    aria-label={`Delete photo ${i + 1}`}
                    className="rounded-md p-1.5 text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

          {!isEdit &&
            previews.map((src, i) => (
              <div key={src} className="relative">
                <div className="aspect-[3/4] overflow-hidden rounded-lg border border-border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                </div>
                {i === 0 && (
                  <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    Cover
                  </span>
                )}
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setQueued((q) => q.filter((_, j) => j !== i))}
                    aria-label={`Remove photo ${i + 1}`}
                    className="rounded-md p-1.5 text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

          {(isEdit ? images.length : queued.length) < MAX_IMAGES && (
            <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-center text-sm text-muted-foreground hover:border-primary hover:text-primary">
              <ImagePlus className="h-7 w-7" />
              {busy ? status || "Working..." : "Add photos"}
              {!busy && <span className="px-2 text-xs">Select several, or drop them here</span>}
              <input
                type="file"
                accept={OK_TYPES.join(",")}
                multiple
                className="sr-only"
                disabled={busy || pending}
                onChange={(e) => {
                  void pickFiles(e.target.files);
                  e.target.value = ""; // so the same file can be picked again
                }}
              />
            </label>
          )}
        </div>
        {status && <p className="mt-3 text-sm text-muted-foreground">{status}</p>}
        {photoMsg.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-red-500">
            {photoMsg.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
        {!isEdit && queued.length === 0 && (
          <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
            <BookCover name={v.name || "Your book"} cover={null} className="h-16 w-12 shrink-0 rounded-md" />
            Without a photo, the book shows a coloured cover with its title.
          </div>
        )}
      </section>

      {errors[FORM_ERROR] && <p className="text-sm text-red-500">{errors[FORM_ERROR]}</p>}
      <div className="flex justify-end gap-3">
        <Link
          href={isEdit ? `/products/${productId}` : "/products"}
          className="flex h-11 items-center rounded-lg border border-border px-5 text-base font-medium hover:bg-muted"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending || busy}
          className="h-11 rounded-lg bg-primary px-5 text-base font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving..." : isEdit ? "Save Changes" : "Add Product"}
        </button>
      </div>
    </form>
  );
}
