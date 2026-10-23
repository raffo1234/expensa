import type { DataTableColumn } from "@/components/DataTable";

// Column sets shared by each table and its loading skeleton, so the skeleton
// always shows the same headers as the real table. Kept outside the client
// components so server pages can import them. `hideBelow` marks the columns
// that give way first when the table's card is narrow, so it never scrolls.

export const EXPENSE_COLUMNS: DataTableColumn[] = [
  { label: "Factura" },
  { label: "Proveedor" },
  { label: "Categoría", hideBelow: "lg" },
  { label: "Método", hideBelow: "xl" },
  { label: "Fecha de emisión", hideBelow: "md" },
  { label: "Monto", align: "right" },
  { label: "Materiales", align: "center", hideBelow: "xl" },
  { label: "Guía", align: "center" },
  { label: "" },
];

export const summaryColumns = (tab: "facturas" | "gastos"): DataTableColumn[] => [
  { label: tab === "facturas" ? "Factura" : "Descripción" },
  { label: "Proveedor" },
  { label: "Categoría", hideBelow: "lg" },
  { label: "Método de pago", hideBelow: "xl" },
  { label: "Fecha emisión", hideBelow: "md" },
  { label: "Monto", align: "right" },
  { label: "Adjuntos" },
];

export const MATERIAL_SUMMARY_COLUMNS: DataTableColumn[] = [
  { label: "Material" },
  { label: "Cantidad", align: "right" },
  { label: "Subtotal", align: "right" },
];

export const MATERIAL_DETAIL_COLUMNS: DataTableColumn[] = [
  { label: "Material" },
  { label: "Marca", hideBelow: "xl" },
  { label: "Nivel", hideBelow: "lg" },
  { label: "Proveedor", hideBelow: "md" },
  { label: "Fecha de pago", hideBelow: "md" },
  { label: "Cantidad", align: "right" },
  { label: "P. unit.", align: "right", hideBelow: "xl" },
  { label: "Subtotal", align: "right" },
];

export const WORKSPACE_COLUMNS: DataTableColumn[] = [
  { label: "Proyecto" },
  { label: "URL", hideBelow: "md" },
  { label: "Gastos", align: "right" },
  { label: "Creado", hideBelow: "md" },
  { label: "" },
];

export const PROVIDER_COLUMNS: DataTableColumn[] = [
  { label: "Nombre" },
  { label: "RUC" },
  { label: "" },
];
