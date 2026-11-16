import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Company } from "@/db/schema";
import { SANS, SERIF } from "./fonts";

// One A4 template for the "paper" documents that share the invoice look:
// quotations and customer statements.

const INK = "#111827";
const MUTED = "#6b7280";
const LABEL = "#9ca3af";
const BORDER = "#e5e7eb";

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: SANS, fontSize: 10, color: INK, lineHeight: 1.4 },
  between: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 8, letterSpacing: 1.2, color: LABEL, textTransform: "uppercase" },
  small: { fontSize: 9.5, color: MUTED },
  logo: { width: 36, height: 36, borderRadius: 4, backgroundColor: "#dc2626", alignItems: "center", justifyContent: "center" },
  logoGlyph: { color: "#ffffff", fontFamily: ["NotoDeva"], fontWeight: 700, fontSize: 22, lineHeight: 1.5 },
  company: { fontFamily: SERIF, fontWeight: 700, fontSize: 22, lineHeight: 1.25, marginTop: 12, marginBottom: 5 },
  docNo: { fontWeight: 700, fontSize: 24, lineHeight: 1.25, marginTop: 4, marginBottom: 6 },
  rule: { borderBottomWidth: 1, borderBottomColor: INK, marginTop: 14, marginBottom: 14 },
  partyName: { fontWeight: 700, fontSize: 12.5, lineHeight: 1.3, marginTop: 5, marginBottom: 3 },
  table: { borderWidth: 1, borderColor: BORDER, marginTop: 16 },
  th: { flexDirection: "row", backgroundColor: "#f3f4f6", paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  tr: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  trLast: { borderBottomWidth: 0 },
  totals: { width: 250 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  bigRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: BORDER, marginTop: 5, paddingTop: 9 },
  footerRule: { borderTopWidth: 1, borderTopColor: BORDER, marginTop: 28, paddingTop: 10 },
  sign: { width: 160, borderTopWidth: 1, borderTopColor: INK, paddingTop: 4, alignItems: "center" },
});

export interface PdfCol {
  h: string;
  /** Fixed width in points; omit for the one column that should take the remaining space. */
  w?: number;
  align?: "right" | "center";
}
export type PdfCell = string | { text: string; sub?: string; bold?: boolean };
export interface PdfTotal {
  label: string;
  value: string;
  bold?: boolean;
  big?: boolean;
}

export interface SimpleDocumentProps {
  docLabel: string; // "Quotation"
  number: string;
  company: Company;
  rightLines?: string[];
  partyLabel: string; // "Quotation for"
  party: { name: string; lines: string[] };
  sideBlock?: { label: string; lines: string[] };
  cols: PdfCol[];
  rows: PdfCell[][];
  totals?: PdfTotal[];
  notes?: { title: string; text: string }[];
  signLabel?: string;
  footerNote?: string;
}

const colBox = (c: PdfCol) => (c.w ? { width: c.w } : { flexGrow: 1, flexShrink: 1 });

export default function SimpleDocument(p: SimpleDocumentProps) {
  const { company } = p;
  const contact = [company.phone, company.email].filter(Boolean).join(" - ");

  return (
    <Document title={`${p.docLabel} ${p.number}`} author={company.name}>
      <Page size="A4" style={s.page}>
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
            <Text style={s.label}>{p.docLabel}</Text>
            <Text style={s.docNo}>{p.number}</Text>
            {p.rightLines?.map((l, i) => (
              <Text key={i} style={s.small}>
                {l}
              </Text>
            ))}
          </View>
        </View>

        <View style={s.rule} />

        <View style={s.between}>
          <View style={{ maxWidth: 300 }}>
            <Text style={s.label}>{p.partyLabel}</Text>
            <Text style={s.partyName}>{p.party.name}</Text>
            {p.party.lines.map((l, i) => (
              <Text key={i} style={s.small}>
                {l}
              </Text>
            ))}
          </View>
          {p.sideBlock ? (
            <View style={{ alignItems: "flex-end", maxWidth: 240 }}>
              <Text style={s.label}>{p.sideBlock.label}</Text>
              {p.sideBlock.lines.map((l, i) => (
                <Text key={i} style={[s.small, i === 0 ? { marginTop: 4 } : {}]}>
                  {l}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        <View style={s.table}>
          <View style={s.th} fixed>
            {p.cols.map((c, i) => (
              <Text key={i} style={[{ fontWeight: 700, fontSize: 9, textAlign: c.align ?? "left" }, colBox(c)]}>
                {c.h}
              </Text>
            ))}
          </View>
          {p.rows.map((row, ri) => (
            <View key={ri} style={[s.tr, ri === p.rows.length - 1 ? s.trLast : {}]} wrap={false}>
              {row.map((cell, ci) => {
                const c = p.cols[ci];
                const obj = typeof cell === "string" ? { text: cell } : cell;
                return (
                  <View key={ci} style={colBox(c)}>
                    <Text style={{ fontSize: 9.5, fontWeight: obj.bold ? 700 : 400, textAlign: c.align ?? "left" }}>{obj.text}</Text>
                    {obj.sub ? <Text style={{ fontSize: 8, color: MUTED, textAlign: c.align ?? "left" }}>{obj.sub}</Text> : null}
                  </View>
                );
              })}
            </View>
          ))}
          {p.rows.length === 0 ? (
            <View style={s.tr}>
              <Text style={s.small}>Nothing to show.</Text>
            </View>
          ) : null}
        </View>

        {p.totals && p.totals.length > 0 ? (
          <View style={[s.between, { marginTop: 18 }]} wrap={false}>
            <View />
            <View style={s.totals}>
              {p.totals.map((t, i) =>
                t.big ? (
                  <View key={i} style={s.bigRow}>
                    <Text style={{ fontWeight: 700, fontSize: 10.5 }}>{t.label}</Text>
                    <Text style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.3 }}>{t.value}</Text>
                  </View>
                ) : (
                  <View key={i} style={s.totalRow}>
                    <Text style={t.bold ? { fontWeight: 700, fontSize: 10 } : s.small}>{t.label}</Text>
                    <Text style={{ fontSize: 10, fontWeight: t.bold ? 700 : 400 }}>{t.value}</Text>
                  </View>
                )
              )}
            </View>
          </View>
        ) : null}

        <View style={s.footerRule} wrap={false}>
          {p.notes?.map((n, i) => (
            <View key={i} style={{ marginBottom: 8 }}>
              <Text style={{ fontWeight: 700, fontSize: 9.5 }}>{n.title}</Text>
              <Text style={s.small}>{n.text}</Text>
            </View>
          ))}
          <View style={[s.between, { marginTop: 36, alignItems: "flex-end" }]}>
            <Text style={s.small}>{p.footerNote ?? "Thank you for your business."}</Text>
            <View style={s.sign}>
              <Text style={{ fontSize: 9.5 }}>{p.signLabel ?? "Authorised Signatory"}</Text>
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
