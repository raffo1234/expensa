import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { formatAmount } from "@/utils/formatAmount";

Font.register({
  family: "Roboto",
  fonts: [{ src: "/fonts/roboto-latin-400-normal.ttf", fontWeight: 400 }],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    padding: 40,
    fontSize: 10,
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#6b7280",
    marginBottom: 16,
  },
  filters: {
    fontSize: 9,
    color: "#374151",
    marginBottom: 16,
    lineHeight: 1.5,
  },
  row: {
    display: "flex",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 5,
  },
  headerRow: {
    backgroundColor: "#f3f4f6",
  },
  cellDate: { width: "12%" },
  cellProvider: { width: "33%" },
  cellCategory: { width: "25%" },
  cellPayment: { width: "15%" },
  cellAmount: { width: "15%", textAlign: "right" },
  totalRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#111827",
  },
  totalLabel: {
    fontSize: 11,
    marginRight: 8,
  },
  totalValue: {
    fontSize: 11,
  },
});

export type SummaryReportRow = {
  id: string;
  paid_at?: string | null;
  provider_name?: string | null;
  category_name?: string | null;
  payment_method?: string | null;
  amount: number;
  currency: string;
};

const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}-${m}-${y}`;
};

export default function SummaryReportPDF({
  workspaceName,
  filtersLabel,
  rows,
}: {
  workspaceName: string;
  filtersLabel: string;
  rows: SummaryReportRow[];
}) {
  const totalsByCurrency = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.currency] = (acc[r.currency] ?? 0) + r.amount;
    return acc;
  }, {});

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Reporte de gastos — {workspaceName}</Text>
        <Text style={styles.subtitle}>
          Generado el {new Date().toLocaleDateString("es-PE")}
        </Text>
        <Text style={styles.filters}>{filtersLabel}</Text>

        <View style={[styles.row, styles.headerRow]}>
          <Text style={styles.cellDate}>Fecha</Text>
          <Text style={styles.cellProvider}>Proveedor</Text>
          <Text style={styles.cellCategory}>Categoría</Text>
          <Text style={styles.cellPayment}>Método de pago</Text>
          <Text style={styles.cellAmount}>Monto</Text>
        </View>

        {rows.map((r) => (
          <View key={r.id} style={styles.row}>
            <Text style={styles.cellDate}>{fmtDate(r.paid_at)}</Text>
            <Text style={styles.cellProvider}>{r.provider_name ?? "—"}</Text>
            <Text style={styles.cellCategory}>{r.category_name ?? "—"}</Text>
            <Text style={styles.cellPayment}>{r.payment_method ?? "—"}</Text>
            <Text style={styles.cellAmount}>{formatAmount(r.amount, r.currency)}</Text>
          </View>
        ))}

        {Object.entries(totalsByCurrency).map(([currency, amount]) => (
          <View key={currency} style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total {currency}:</Text>
            <Text style={styles.totalValue}>{formatAmount(amount, currency)}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
