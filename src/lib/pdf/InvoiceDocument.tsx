import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { InvoiceDetail } from "@/db/invoices";
import { formatDate } from "@/lib/date";
import { formatINR } from "@/lib/format";
import { SANS, SERIF } from "./fonts";

// ---------- Styles ----------
const INK = "#111827";
const MUTED = "#6b7280";
const LABEL = "#9ca3af";
const BORDER = "#e5e7eb";

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: SANS, fontSize: 10, color: INK, lineHeight: 1.4 },
  row: { flexDirection: "row" },
  between: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 8, letterSpacing: 1.2, color: LABEL, textTransform: "uppercase" },
  small: { fontSize: 9.5, color: MUTED },

  logo: { width: 36, height: 36, borderRadius: 4, backgroundColor: "#dc2626", alignItems: "center", justifyContent: "center" },
  logoGlyph: { color: "#ffffff", fontFamily: ["NotoDeva"], fontWeight: 700, fontSize: 22, lineHeight: 1.5 },
  company: { fontFamily: SERIF, fontWeight: 700, fontSize: 22, lineHeight: 1.25, marginTop: 12, marginBottom: 5 },
  invoiceNo: { fontWeight: 700, fontSize: 26, lineHeight: 1.25, marginTop: 4, marginBottom: 6 },
  pill: { alignSelf: "flex-end", paddingVertical: 3, paddingHorizontal: 9, borderRadius: 10, marginTop: 8 },
  pillText: { fontSize: 8.5, fontWeight: 700 },
  rule: { borderBottomWidth: 1, borderBottomColor: INK, marginTop: 14, marginBottom: 14 },

  billName: { fontWeight: 700, fontSize: 12.5, lineHeight: 1.3, marginTop: 5, marginBottom: 3 },

  table: { borderWidth: 1, borderColor: BORDER, marginTop: 16 },
  th: { flexDirection: "row", backgroundColor: "#f3f4f6", paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  thText: { fontWeight: 700, fontSize: 9 },
  tr: { flexDirection: "row", paddingVertical: 9, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  trLast: { borderBottomWidth: 0 },
  cNo: { width: 24 },
  cItem: { flexGrow: 1, flexShrink: 1 },
  cQty: { width: 40, textAlign: "right" },
  cRate: { width: 74, textAlign: "right" },
  cDisc: { width: 46, textAlign: "right" },
  cGst: { width: 42, textAlign: "right" },
  cAmt: { width: 84, textAlign: "right" },

  qrBox: { width: 76, height: 76, borderWidth: 1, borderColor: BORDER, padding: 3, marginTop: 4 },
  totals: { width: 235 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  grandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: BORDER, marginTop: 5, paddingTop: 9 },

  footerRule: { borderTopWidth: 1, borderTopColor: BORDER, marginTop: 28, paddingTop: 10 },
  sign: { width: 160, borderTopWidth: 1, borderTopColor: INK, paddingTop: 4, alignItems: "center" },
});

const STATUS = {
  paid: { label: "Paid", bg: "#d1fae5", fg: "#065f46" },
  partial: { label: "Partial", bg: "#dbeafe", fg: "#1e40af" },
  pending: { label: "Pending", bg: "#fef3c7", fg: "#92400e" },
} as const;

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export default function InvoiceDocument({ invoice, qrDataUrl }: { invoice: InvoiceDetail; qrDataUrl: string }) {
  const { company, customer, items } = invoice;
  const status = STATUS[invoice.status];
  const cityLine = [customer.city, customer.state, customer.pincode].filter(Boolean).join(", ");
  const contact = [company.phone, company.email].filter(Boolean).join(" - ");

  return (
    <Document title={`Invoice ${invoice.number}`} author={company.name}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.between}>
          <View style={{ maxWidth: 320 }}>
            <View style={s.logo}>
              <Text style={s.logoGlyph}>द</Text>
            </View>
            <Text style={s.company}>{company.name}</Text>
            {company.address ? <Text style={s.small}>{company.address}</Text> : null}
            {contact ? <Text style={s.small}>{contact}</Text> : null}
            {company.gstin ? <Text style={s.small}>GSTIN: {company.gstin}</Text> : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.label}>Tax Invoice</Text>
            <Text style={s.invoiceNo}>{invoice.number}</Text>
            <Text style={s.small}>Date: {formatDate(invoice.date)}</Text>
            <View style={[s.pill, { backgroundColor: status.bg }]}>
              <Text style={[s.pillText, { color: status.fg }]}>{status.label}</Text>
            </View>
          </View>
        </View>

        <View style={s.rule} />

        {/* Bill to / Payment */}
        <View style={s.between}>
          <View style={{ maxWidth: 300 }}>
            <Text style={s.label}>Bill To</Text>
            <Text style={s.billName}>{customer.name}</Text>
            {customer.mobile ? <Text style={s.small}>{customer.mobile}</Text> : null}
            {customer.email ? <Text style={s.small}>{customer.email}</Text> : null}
            {customer.address ? <Text style={s.small}>{customer.address}</Text> : null}
            {cityLine ? <Text style={s.small}>{cityLine}</Text> : null}
            {customer.gstin ? <Text style={s.small}>GSTIN: {customer.gstin}</Text> : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.label}>Payment</Text>
            <Text style={[s.small, { marginTop: 4 }]}>Mode: {cap(invoice.paymentMode)}</Text>
            <Text style={s.small}>Paid: {formatINR(invoice.paid)}</Text>
            <Text style={{ fontSize: 9.5, fontWeight: 700, color: invoice.balance > 0 ? "#dc2626" : "#059669" }}>
              Balance: {formatINR(invoice.balance)}
            </Text>
          </View>
        </View>

        {/* Items */}
        <View style={s.table}>
          <View style={s.th} fixed>
            <Text style={[s.thText, s.cNo]}>#</Text>
            <Text style={[s.thText, s.cItem]}>Item</Text>
            <Text style={[s.thText, s.cQty]}>Qty</Text>
            <Text style={[s.thText, s.cRate]}>Rate</Text>
            <Text style={[s.thText, s.cDisc]}>Disc</Text>
            <Text style={[s.thText, s.cGst]}>GST</Text>
            <Text style={[s.thText, s.cAmt]}>Amount</Text>
          </View>
          {items.map((it, i) => (
            <View key={i} style={[s.tr, i === items.length - 1 ? s.trLast : {}]} wrap={false}>
              <Text style={[{ fontSize: 9.5 }, s.cNo]}>{i + 1}</Text>
              <View style={s.cItem}>
                <Text style={{ fontWeight: 600, fontSize: 10 }}>{it.name}</Text>
                <Text style={{ fontSize: 8, color: MUTED }}>{it.sku}</Text>
              </View>
              <Text style={[{ fontSize: 10 }, s.cQty]}>{it.quantity}</Text>
              <Text style={[{ fontSize: 10 }, s.cRate]}>{formatINR(it.rate)}</Text>
              <Text style={[{ fontSize: 10 }, s.cDisc]}>{it.discountPercent}%</Text>
              <Text style={[{ fontSize: 10 }, s.cGst]}>{it.gstPercent}%</Text>
              <Text style={[{ fontSize: 10, fontWeight: 700 }, s.cAmt]}>{formatINR(it.amount)}</Text>
            </View>
          ))}
        </View>

        {/* QR + totals */}
        <View style={[s.between, { marginTop: 18 }]} wrap={false}>
          <View>
            <Text style={s.label}>Scan to pay / verify</Text>
            <View style={s.qrBox}>
              <Image src={qrDataUrl} />
            </View>
          </View>
          <View style={s.totals}>
            <View style={s.totalRow}>
              <Text style={s.small}>Subtotal</Text>
              <Text style={{ fontSize: 10 }}>{formatINR(invoice.subtotal)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.small}>GST</Text>
              <Text style={{ fontSize: 10 }}>{formatINR(invoice.gst)}</Text>
            </View>
            <View style={s.grandRow}>
              <Text style={{ fontWeight: 700, fontSize: 10.5 }}>Grand Total</Text>
              <Text style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.3 }}>{formatINR(invoice.grandTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Terms + signature */}
        <View style={s.footerRule} wrap={false}>
          {company.terms ? (
            <View>
              <Text style={{ fontWeight: 700, fontSize: 9.5 }}>Terms & Conditions</Text>
              <Text style={s.small}>{company.terms}</Text>
            </View>
          ) : null}
          <View style={[s.between, { marginTop: 40, alignItems: "flex-end" }]}>
            <Text style={s.small}>Thank you for your business.</Text>
            <View style={s.sign}>
              <Text style={{ fontSize: 9.5 }}>Authorised Signatory</Text>
              <Text style={{ fontSize: 8, color: MUTED }}>for {company.name}</Text>
            </View>
          </View>
        </View>
        <Text
          fixed
          style={{ position: "absolute", bottom: 20, right: 40, fontSize: 8, color: LABEL }}
          render={({ pageNumber, totalPages }) => (totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : "")}
        />
      </Page>
    </Document>
  );
}
