"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { INPUT_CLASS, SECONDARY_BUTTON_CLASS, SELECT_CLASS } from "@/constants";
import { setGuideExemption } from "@/actions/expenses";
import {
  GUIDE_EXEMPT_REASONS,
  GUIDE_EXEMPT_REASON_LABELS,
  isGuideExemptReason,
  type GuideExemptReason,
} from "@/lib/expenseDocs";
import { useInvalidateExpenseLists } from "@/hooks/useInvalidateExpenseLists";
import SubmitButton from "./SubmitButton";

const dateFormatter = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" });

/**
 * Why this expense has (or doesn't need) a guía de remisión: an admin's
 * exemption with its reason and author, the category's rule, or, for admins,
 * the way to mark an exemption.
 */
export default function GuideExemption({
  expenseId,
  exemption,
  categoryName,
  categoryRequiresGuide,
  canExempt,
  readOnly,
  onSaved,
}: {
  expenseId: string;
  exemption: { reason: string; note: string | null; at: string | null; by: string | null } | null;
  categoryName: string | null;
  categoryRequiresGuide: boolean;
  /** Has the EXEMPT_GUIDE permission (the server checks it again). */
  canExempt: boolean;
  readOnly: boolean;
  /** Called after saving, for screens that cache the expense themselves. */
  onSaved?: () => void;
}) {
  const router = useRouter();
  const invalidateLists = useInvalidateExpenseLists();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<GuideExemptReason>("recojo_tienda");
  const [note, setNote] = useState("");
  const [saving, startSaving] = useTransition();
  const editable = canExempt && !readOnly;

  const save = (next: GuideExemptReason | null) =>
    startSaving(async () => {
      const { error } = await setGuideExemption(expenseId, next, note);
      if (error) {
        toast.error("No se pudo guardar. Inténtalo de nuevo.");
        return;
      }
      toast.success(next ? "Marcado: no requiere guía de remisión" : "Excepción quitada");
      setOpen(false);
      invalidateLists();
      onSaved?.();
      router.refresh();
    });

  const box =
    "mb-3 rounded-lg border border-navy-100 bg-navy-50/60 px-4 py-3 text-sm text-navy-700";

  if (exemption) {
    const label = isGuideExemptReason(exemption.reason)
      ? GUIDE_EXEMPT_REASON_LABELS[exemption.reason]
      : exemption.reason;
    return (
      <div className={`${box} flex flex-wrap items-center gap-x-3 gap-y-2`}>
        <span className="mr-auto">
          <span className="font-medium text-navy-900">Sin guía de remisión: {label}</span>
          {exemption.note && <> — {exemption.note}</>}
          {(exemption.by || exemption.at) && (
            <span className="block text-xs text-navy-500">
              Marcado{exemption.by && ` por ${exemption.by}`}
              {exemption.at && ` el ${dateFormatter.format(new Date(exemption.at))}`}
            </span>
          )}
        </span>
        {editable && (
          <SubmitButton
            type="button"
            pending={saving}
            pendingLabel="Quitando…"
            base={SECONDARY_BUTTON_CLASS}
            onClick={() => save(null)}
          >
            Quitar excepción
          </SubmitButton>
        )}
      </div>
    );
  }

  if (!categoryRequiresGuide) {
    return (
      <p className={box}>
        {categoryName ? `«${categoryName}»` : "Esta categoría"} no requiere guía de remisión.
      </p>
    );
  }

  if (!editable) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-3 cursor-pointer text-sm text-link-hover underline decoration-violet-300 underline-offset-4 hover:text-violet-900"
      >
        Esta compra no requiere guía de remisión
      </button>
    );
  }

  return (
    <div className={`${box} space-y-3`}>
      <p className="font-medium text-navy-900">¿Por qué no requiere guía?</p>
      <div className="grid gap-2 sm:grid-cols-[12rem_1fr]">
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as GuideExemptReason)}
          aria-label="Motivo"
          className={SELECT_CLASS}
        >
          {GUIDE_EXEMPT_REASONS.map((r) => (
            <option key={r} value={r}>
              {GUIDE_EXEMPT_REASON_LABELS[r]}
            </option>
          ))}
        </select>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          placeholder="Nota (opcional), p. ej. recogido por Juan el 24/10"
          aria-label="Nota"
          className={INPUT_CLASS}
        />
      </div>
      <div className="flex gap-2">
        <SubmitButton type="button" pending={saving} onClick={() => save(reason)}>
          Guardar
        </SubmitButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={saving}
          className={SECONDARY_BUTTON_CLASS}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
