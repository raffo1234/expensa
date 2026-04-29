"use client";

const CATEGORY_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  // — General —
  food: { label: "Alimentación", bg: "#fef3c7", color: "#92400e" },
  transport: { label: "Transporte", bg: "#dbeafe", color: "#1e40af" },
  rent: { label: "Renta", bg: "#ede9fe", color: "#5b21b6" },
  utilities: { label: "Servicios", bg: "#d1fae5", color: "#065f46" },
  health: { label: "Salud", bg: "#fee2e2", color: "#991b1b" },
  entertainment: { label: "Entretenimiento", bg: "#fce7f3", color: "#9d174d" },
  education: { label: "Educación", bg: "#e0f2fe", color: "#075985" },
  shopping: { label: "Compras", bg: "#fdf4ff", color: "#7e22ce" },
  travel: { label: "Viajes", bg: "#fff7ed", color: "#c2410c" },
  subscriptions: { label: "Suscripciones", bg: "#f0fdf4", color: "#166534" },
  salary: { label: "Nómina", bg: "#ecfdf5", color: "#047857" },
  taxes: { label: "Impuestos", bg: "#fef9c3", color: "#854d0e" },
  office: { label: "Oficina", bg: "#f1f5f9", color: "#334155" },
  marketing: { label: "Marketing", bg: "#fdf2f8", color: "#86198f" },
  software: { label: "Software", bg: "#eff6ff", color: "#1d4ed8" },

  // — Construcción —
  materials: { label: "Materiales", bg: "#fef3c7", color: "#78350f" },
  cement: { label: "Cemento", bg: "#f1f5f9", color: "#1e293b" },
  steel: { label: "Acero / Fierro", bg: "#e2e8f0", color: "#0f172a" },
  wood: { label: "Madera", bg: "#fdf4e7", color: "#7c3d0e" },
  paint: { label: "Pintura", bg: "#ede9fe", color: "#4c1d95" },
  plumbing: { label: "Plomería", bg: "#e0f2fe", color: "#0c4a6e" },
  electrical: { label: "Eléctrico", bg: "#fef9c3", color: "#713f12" },
  machinery: { label: "Maquinaria", bg: "#fce7f3", color: "#831843" },
  tools: { label: "Herramientas", bg: "#fff7ed", color: "#9a3412" },
  labor: { label: "Mano de obra", bg: "#dcfce7", color: "#14532d" },
  subcontract: { label: "Subcontrato", bg: "#fdf2f8", color: "#701a75" },
  equipment_rental: { label: "Alquiler equipo", bg: "#e0f2fe", color: "#164e63" },
  safety: { label: "Seguridad / EPP", bg: "#fee2e2", color: "#7f1d1d" },
  permits: { label: "Permisos / Licencias", bg: "#fef3c7", color: "#92400e" },
  design: { label: "Diseño / Planos", bg: "#eff6ff", color: "#1e3a8a" },
  topography: { label: "Topografía", bg: "#f0fdf4", color: "#14532d" },
  demolition: { label: "Demolición", bg: "#fdf4ff", color: "#581c87" },
  earthwork: { label: "Movimiento tierra", bg: "#fef9c3", color: "#78350f" },
  concrete: { label: "Concreto", bg: "#f8fafc", color: "#334155" },
  tiles: { label: "Pisos / Cerámicos", bg: "#fdf4e7", color: "#92400e" },
  glass: { label: "Vidrios / Ventanas", bg: "#e0f7fa", color: "#006064" },
  insulation: { label: "Aislamiento", bg: "#f3e8ff", color: "#6b21a8" },
  roofing: { label: "Techado", bg: "#fff1f2", color: "#9f1239" },
  cleaning: { label: "Limpieza obra", bg: "#f0fdf4", color: "#166534" },
  inspection: { label: "Inspección", bg: "#eff6ff", color: "#1d4ed8" },
  logistics: { label: "Logística / Flete", bg: "#dbeafe", color: "#1e3a8a" },
  fuel: { label: "Combustible", bg: "#fef3c7", color: "#b45309" },

  other: { label: "Otro", bg: "#f3f4f6", color: "#374151" },
};

interface CategoryBadgeProps {
  category?: string | null;
}

export default function CategoryBadge({ category }: CategoryBadgeProps) {
  const key = category?.toLowerCase() ?? "other";
  const config = CATEGORY_CONFIG[key] ?? CATEGORY_CONFIG.other;

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}
