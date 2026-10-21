import type { DataTableColumn } from "@/components/DataTable";

// Column sets shared by each table and its loading skeleton, so the skeleton
// always shows the same headers as the real table. Kept outside the client
// components so server pages can import them.

export const EXPENSE_COLUMNS: DataTableColumn[] = [
  { label: "Factura" },
  { label: "Proveedor" },
  { label: "Categoría" },
  { label: "Método" },
  { label: "Fecha de emisión" },
  { label: "Monto", align: "right" },
  { label: "Materiales", align: "center" },
  { label: "" },
];

export const summaryColumns = (tab: "facturas" | "gastos"): DataTableColumn[] => [
  { label: tab === "facturas" ? "Factura" : "Descripción" },
  { label: "Proveedor" },
  { label: "Categoría" },
  { label: "Método de pago" },
  { label: "Fecha emisión" },
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
  { label: "Marca" },
  { label: "Nivel" },
  { label: "Proveedor" },
  { label: "Fecha de pago" },
  { label: "Cantidad", align: "right" },
  { label: "P. unit.", align: "right" },
  { label: "Subtotal", align: "right" },
];

export const WORKSPACE_COLUMNS: DataTableColumn[] = [
  { label: "Proyecto" },
  { label: "URL" },
  { label: "Gastos", align: "right" },
  { label: "Creado" },
  { label: "" },
];

export const PROVIDER_COLUMNS: DataTableColumn[] = [
  { label: "Nombre" },
  { label: "RUC" },
  { label: "" },
];
