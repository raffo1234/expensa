"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { SELECT_CLASS } from "@/constants";
import LoadingSwap from "./LoadingSwap";
import SelectChevron from "./SelectChevron";
import { setAttachmentKind } from "@/actions/expenses";
import { ATTACHMENT_KINDS, ATTACHMENT_KIND_LABELS, type AttachmentKind } from "@/lib/dispatchGuide";

/**
 * What this file is (factura, guía de remisión...). Marking a file as a guide
 * is what makes the expense count as "Con guía". Saved right away.
 */
export default function AttachmentKindSelect({
  attachmentId,
  kind,
}: {
  attachmentId: string;
  kind: AttachmentKind;
}) {
  const router = useRouter();
  const [value, setValue] = useState(kind);
  const [saving, startSaving] = useTransition();
  // Brief ✓ after a successful save, so it's clear the change was stored.
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1500);
    return () => clearTimeout(t);
  }, [saved]);

  const change = (next: AttachmentKind) => {
    const previous = value;
    setSaved(false);
    setValue(next); // optimistic; reverted if saving fails
    startSaving(async () => {
      const { error } = await setAttachmentKind(attachmentId, next);
      if (error) {
        setValue(previous);
        toast.error("No se pudo cambiar el tipo del adjunto.");
        return;
      }
      setSaved(true);
      toast.success(`Adjunto marcado como «${ATTACHMENT_KIND_LABELS[next]}»`);
      router.refresh(); // updates the expense's guide status
    });
  };

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => {
          if (!saving) change(e.target.value as AttachmentKind);
        }}
        aria-busy={saving}
        aria-label="Tipo de adjunto"
        // bg-none: the arrow is drawn below so it can turn into loading dots.
        className={`${SELECT_CLASS} bg-none ${saving ? "pointer-events-none" : ""}`}
      >
        {ATTACHMENT_KINDS.map((k) => (
          <option key={k} value={k}>
            {ATTACHMENT_KIND_LABELS[k]}
          </option>
        ))}
      </select>
      {/* Same spot as the .select-field arrow (right 0.6rem, 1rem wide). */}
      <span className="pointer-events-none absolute top-1/2 right-[0.6rem] flex size-4 -translate-y-1/2 items-center justify-center">
        <LoadingSwap busy={saving}>
          {saved ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
              className="text-violet-600"
            >
              <path
                d="m5 12.5 4.5 4.5L19 7.5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <SelectChevron />
          )}
        </LoadingSwap>
      </span>
      <span role="status" className="sr-only">
        {saved ? "Guardado" : ""}
      </span>
    </div>
  );
}
