"use client";

import { useState } from "react";
import { useGlobalState } from "@/lib/globalState";
import { supabase } from "@/lib/supabase";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "@/constants";
import Field from "./Field";
import { createProvider } from "@/actions/providers";

type Provider = { id: string; name: string; ruc: string };

function validateRuc(ruc: string): string | null {
  if (!/^\d{11}$/.test(ruc)) return "El RUC debe tener exactamente 11 dígitos numéricos.";
  if (!ruc.startsWith("1") && !ruc.startsWith("2")) return "El RUC debe empezar con 1 o 2.";
  return null;
}

export default function AddProviderModal({
  workspaceId,
  onSelect,
}: {
  workspaceId: string;
  onSelect: (provider: Provider) => void;
}) {
  const { setModalOpen } = useGlobalState();
  const [form, setForm] = useState({ name: "", ruc: "" });
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<Provider | null>(null);
  const [isPending, setIsPending] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    setError(null);
    setExisting(null);

    const rucError = validateRuc(form.ruc);
    if (rucError) {
      setError(rucError);
      return;
    }
    if (!form.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    setIsPending(true);
    try {
      const { data: found } = await supabase
        .from("provider")
        .select("id, name, ruc")
        .eq("workspace_id", workspaceId)
        .eq("ruc", form.ruc)
        .single();

      if (found) {
        setExisting(found);
        setError("Ya existe un proveedor con ese RUC.");
        return;
      }

      const result = await createProvider({
        workspace_id: workspaceId,
        name: form.name.trim(),
        ruc: form.ruc,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      onSelect(result.provider!);
      setModalOpen(false);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-5 p-1">
      <h2 className="text-base font-semibold text-gray-900">Nuevo proveedor</h2>

      <Field label="RUC *">
        <input
          type="text"
          maxLength={11}
          placeholder="20xxxxxxxxx"
          value={form.ruc}
          onChange={set("ruc")}
          className={INPUT_CLASS}
        />
      </Field>

      <Field label="Nombre *">
        <input
          type="text"
          placeholder="Razón social"
          value={form.name}
          onChange={set("name")}
          className={INPUT_CLASS}
        />
      </Field>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 space-y-2">
          <p>{error}</p>
          {existing && (
            <button
              type="button"
              onClick={() => {
                onSelect(existing);
                setModalOpen(false);
              }}
              className="text-cyan-600 underline underline-offset-2 font-medium"
            >
              Usar &quot;{existing.name}&quot;
            </button>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => setModalOpen(false)}
          className={SECONDARY_BUTTON_CLASS}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className={PRIMARY_BUTTON_CLASS}
        >
          {isPending ? "Guardando..." : "Agregar proveedor"}
        </button>
      </div>
    </div>
  );
}
