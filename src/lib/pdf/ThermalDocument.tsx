import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { InvoiceDetail } from "@/db/invoices";
import { formatDate } from "@/lib/date";
import { formatINR } from "@/lib/format";
import { SANS } from "./fonts";

// 80 mm receipt paper (226.77 pt wide). The page is one continuous strip, so its height is estimated from the content.
const WIDTH = 226.77;
const MARGIN = 10;

const s = StyleSheet.create({
  page: { padding: MARGIN, fontFamily: SANS, fontSize: 8.5, color: "#000000", lineHeight: 1.35 },
  center: { textAlign: "center" },
  bold: { fontWeight: 700 },
  dash: { borderBottomWidth: 1, borderBottomColor: "#000000", borderStyle: "dashed", marginVertical: 6 },
  row: { flexDirection: "row", justifyContent: "space-between" },
});

const lines = (text: string, perLine: number) => Math.max(1, Math.ceil(text.length / perLine));

function estimateHeight(inv: InvoiceDetail) {
  const { company, customer } = inv;
  let h = MARGIN * 2 + 25; // company name + rules
  h += lines(company.address, 38) * 12 + 14;
  h += 58; // invoice no / date / customer heading
  h += lines(customer.address, 38) * 11;
  h += 22; // column heading
  for (const it of inv.items) h += lines(it.name, 34) * 12 + 10;
  h += 100; // totals, payment lines
  h += lines(company.terms, 40) * 10 + 30; // terms + thank you
  return Math.ceil(h) + 30; // slack so wrapped Hindi text never spills onto a second page
}

export default function ThermalDocument({ invoice }: { invoice: InvoiceDetail }) {
  const { company, customer, items } = invoice;

  return (
    <Document title={`Receipt ${invoice.number}`} author={company.name}>
      <Page size={[WIDTH, estimateHeight(invoice)]} style={s.page}>
        <Text style={[s.center, s.bold, { fontSize: 12, lineHeight: 1.4 }]}>{company.name}</Text>
        {company.address ? <Text style={s.center}>{company.address}</Text> : null}
        {company.phone ? <Text style={s.center}>Ph: {company.phone}</Text> : null}
        {company.gstin ? <Text style={s.center}>GSTIN: {company.gstin}</Text> : null}

        <View style={s.dash} />
        <View style={s.row}>
          <Text style={s.bold}>Invoice {invoice.number}</Text>
          <Text>{formatDate(invoice.date)}</Text>
        </View>
        <Text style={{ marginTop: 3 }}>
          <Text style={s.bold}>To: </Text>
          {customer.name}
        </Text>
        {customer.mobile ? <Text>{customer.mobile}</Text> : null}
        {customer.address ? <Text>{customer.address}</Text> : null}

        <View style={s.dash} />
        <View style={s.row}>
          <Text style={s.bold}>Item</Text>
          <Text style={s.bold}>Amount</Text>
        </View>
        {items.map((it, i) => (
          <View key={i} style={{ marginTop: 4 }} wrap={false}>
            <Text style={s.bold}>{it.name}</Text>
            <View style={s.row}>
              <Text>
                {it.quantity} x {formatINR(it.rate)}
                {it.discountPercent > 0 ? `  (-${it.discountPercent}%)` : ""}
                {it.gstPercent > 0 ? `  GST ${it.gstPercent}%` : ""}
              </Text>
              <Text style={s.bold}>{formatINR(it.amount)}</Text>
            </View>
          </View>
        ))}

        <View style={s.dash} />
        <View style={s.row}>
          <Text>Subtotal</Text>
          <Text>{formatINR(invoice.subtotal)}</Text>
        </View>
        <View style={s.row}>
          <Text>GST</Text>
          <Text>{formatINR(invoice.gst)}</Text>
        </View>
        <View style={[s.row, { marginTop: 3 }]}>
          <Text style={[s.bold, { fontSize: 11 }]}>TOTAL</Text>
          <Text style={[s.bold, { fontSize: 11 }]}>{formatINR(invoice.grandTotal)}</Text>
        </View>
        <View style={[s.row, { marginTop: 3 }]}>
          <Text>Paid ({invoice.paymentMode})</Text>
          <Text>{formatINR(invoice.paid)}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.bold}>Balance</Text>
          <Text style={s.bold}>{formatINR(invoice.balance)}</Text>
        </View>

        <View style={s.dash} />
        {company.terms ? <Text style={[s.center, { fontSize: 7.5 }]}>{company.terms}</Text> : null}
        <Text style={[s.center, s.bold, { marginTop: 6 }]}>Thank you! Visit again.</Text>
      </Page>
    </Document>
  );
}
