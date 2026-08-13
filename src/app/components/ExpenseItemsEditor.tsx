"use client";

import { useGlobalState } from "@/lib/globalState";
import { INPUT_CLASS, SELECT_CLASS, SECONDARY_BUTTON_CLASS } from "@/constants";
import Field from "./Field";
import CatalogManagerModal from "./CatalogManagerModal";
import { createMaterial, updateMaterial, deleteMaterial } from "@/actions/materials";
import { createBrand, updateBrand, deleteBrand } from "@/actions/brands";
import { createUnit, updateUnit, deleteUnit } from "@/actions/units";

export type ExpenseItemLine = {
  id: string;
  material_id: string;
  brand_id: string;
  unit_id: string;
  quantity: string;
  unit_price: string;
};

type CatalogItem = { id: string; name: string };
type CatalogKind = "material" | "brand" | "unit";

const ICON_BTN_CLASS =
  "flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-cyan-400 hover:text-cyan-500 transition-colors";

function GearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default function ExpenseItemsEditor({
  workspaceId,
  lines,
  onChange,
  materials,
  brands,
  units,
  onMaterialsChange,
  onBrandsChange,
  onUnitsChange,
}: {
  workspaceId: string;
  lines: ExpenseItemLine[];
  onChange: (lines: ExpenseItemLine[]) => void;
  materials: CatalogItem[];
  brands: CatalogItem[];
  units: CatalogItem[];
  onMaterialsChange: (items: CatalogItem[]) => void;
  onBrandsChange: (items: CatalogItem[]) => void;
  onUnitsChange: (items: CatalogItem[]) => void;
}) {
  const { setModalContent, setModalOpen } = useGlobalState();

  const addLine = () => {
    onChange([
      ...lines,
      { id: crypto.randomUUID(), material_id: "", brand_id: "", unit_id: "", quantity: "", unit_price: "" },
    ]);
  };

  const updateLine = (id: string, patch: Partial<ExpenseItemLine>) => {
    onChange(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const removeLine = (id: string) => {
    onChange(lines.filter((l) => l.id !== id));
  };

  const openManager = (kind: CatalogKind) => {
    const config: Record<
      CatalogKind,
      {
        title: string;
        placeholder: string;
        items: CatalogItem[];
        onUpdate: (items: CatalogItem[]) => void;
        create: (name: string) => Promise<{ item?: CatalogItem; error?: string }>;
        update: (id: string, name: string) => Promise<{ error?: string }>;
        remove: (id: string) => Promise<{ error?: string }>;
      }
    > = {
      material: {
        title: "Materiales",
        placeholder: 'Ej: Fierro corrugado 1/2"',
        items: materials,
        onUpdate: onMaterialsChange,
        create: async (name) => {
          const r = await createMaterial({ workspace_id: workspaceId, name });
          return { item: r.material, error: r.error };
        },
        update: (id, name) => updateMaterial(id, { name }),
        remove: deleteMaterial,
      },
      brand: {
        title: "Marcas",
        placeholder: "Ej: Sider",
        items: brands,
        onUpdate: onBrandsChange,
        create: async (name) => {
          const r = await createBrand({ workspace_id: workspaceId, name });
          return { item: r.brand, error: r.error };
        },
        update: (id, name) => updateBrand(id, { name }),
        remove: deleteBrand,
      },
      unit: {
        title: "Unidades",
        placeholder: "Ej: saco, rollo, carretilla",
        items: units,
        onUpdate: onUnitsChange,
        create: async (name) => {
          const r = await createUnit({ workspace_id: workspaceId, name });
          return { item: r.unit, error: r.error };
        },
        update: (id, name) => updateUnit(id, { name }),
        remove: deleteUnit,
      },
    };

    const c = config[kind];
    setModalContent(
      <CatalogManagerModal
        title={c.title}
        namePlaceholder={c.placeholder}
        items={c.items}
        onUpdate={c.onUpdate}
        create={c.create}
        update={c.update}
        remove={c.remove}
      />,
    );
    setModalOpen(true);
  };

  return (
    <div className="space-y-3">
      {lines.map((line, idx) => (
        <div key={line.id} className="rounded-xl border border-gray-200 p-4 space-y-3 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400">Material {idx + 1}</span>
            <button
              type="button"
              onClick={() => removeLine(line.id)}
              className="w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors text-lg"
              aria-label="Eliminar material"
            >
              ×
            </button>
          </div>

          <Field label="Material *">
            <div className="flex items-center gap-2">
              <select
                value={line.material_id}
                onChange={(e) => updateLine(line.id, { material_id: e.target.value })}
                className={SELECT_CLASS}
              >
                <option value="">Seleccionar</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <button type="button" onClick={() => openManager("material")} className={ICON_BTN_CLASS}>
                <GearIcon />
              </button>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Marca">
              <div className="flex items-center gap-2">
                <select
                  value={line.brand_id}
                  onChange={(e) => updateLine(line.id, { brand_id: e.target.value })}
                  className={SELECT_CLASS}
                >
                  <option value="">Sin marca</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <button type="button" onClick={() => openManager("brand")} className={ICON_BTN_CLASS}>
                  <GearIcon />
                </button>
              </div>
            </Field>
            <Field label="Unidad *">
              <div className="flex items-center gap-2">
                <select
                  value={line.unit_id}
                  onChange={(e) => updateLine(line.id, { unit_id: e.target.value })}
                  className={SELECT_CLASS}
                >
                  <option value="">Seleccionar</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <button type="button" onClick={() => openManager("unit")} className={ICON_BTN_CLASS}>
                  <GearIcon />
                </button>
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Cantidad *">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="0"
                value={line.quantity}
                onChange={(e) => updateLine(line.id, { quantity: e.target.value })}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Precio unitario (S/)">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={line.unit_price}
                onChange={(e) => updateLine(line.id, { unit_price: e.target.value })}
                className={INPUT_CLASS}
              />
            </Field>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addLine}
        className={`${SECONDARY_BUTTON_CLASS} w-full justify-center`}
      >
        + Agregar material
      </button>
    </div>
  );
}
