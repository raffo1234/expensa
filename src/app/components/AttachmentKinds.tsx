"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { SELECT_CLASS } from "@/constants";
import { setAttachmentKind } from "@/actions/expenses";
import { ATTACHMENT_KINDS, ATTACHMENT_KIND_LABELS, type AttachmentKind } from "@/lib/dispatchGuide";
import GuideStatusBadge from "./GuideStatusBadge";

// Optimistic attachment types for the expense detail: a change shows at once
// (in the select AND in the guide notice), is saved in the background, and is
// rolled back with an error message if saving fails. No waiting states.

type Kinds = Record<string, AttachmentKind>;

const KindsContext = createContext<{
  kinds: Kinds;
  setKind: (id: string, kind: AttachmentKind) => void;
} | null>(null);

function useKinds() {
  const ctx = useContext(KindsContext);
  if (!ctx) throw new Error("AttachmentKinds components need <AttachmentKindsProvider>");
  return ctx;
}

export function AttachmentKindsProvider({
  initial,
  children,
}: {
  /** Types as stored, by attachment id (from the server render). */
  initial: Kinds;
  children: ReactNode;
}) {
  const router = useRouter();
  const [kinds, setKinds] = useState(initial);

  // When the page refreshes from the server, its data is the source of truth.
  const serverKey = JSON.stringify(initial);
  useEffect(() => {
    setKinds(JSON.parse(serverKey) as Kinds);
  }, [serverKey]);

  const setKind = (id: string, kind: AttachmentKind) => {
    const previous = kinds[id];
    if (previous === kind) return;

    setKinds((k) => ({ ...k, [id]: kind })); // instant
    toast.success(`Adjunto marcado como «${ATTACHMENT_KIND_LABELS[kind]}»`);

    setAttachmentKind(id, kind)
      .then(({ error }) => {
        if (error) throw new Error(error);
        router.refresh(); // keeps the rest of the page in sync, in the background
      })
      .catch(() => {
        // Roll back, unless the user already picked something else meanwhile.
        setKinds((k) => (k[id] === kind ? { ...k, [id]: previous } : k));
        toast.error("No se pudo guardar el tipo del adjunto. Se restauró el anterior.");
      });
  };

  return <KindsContext.Provider value={{ kinds, setKind }}>{children}</KindsContext.Provider>;
}

/** What this file is (factura, guía de remisión...). Changes apply at once. */
export function AttachmentKindSelect({ attachmentId }: { attachmentId: string }) {
  const { kinds, setKind } = useKinds();
  return (
    <select
      value={kinds[attachmentId] ?? "otro"}
      onChange={(e) => setKind(attachmentId, e.target.value as AttachmentKind)}
      aria-label="Tipo de adjunto"
      className={SELECT_CLASS}
    >
      {ATTACHMENT_KINDS.map((k) => (
        <option key={k} value={k}>
          {ATTACHMENT_KIND_LABELS[k]}
        </option>
      ))}
    </select>
  );
}

/** "This invoice needs its guide" notice, following the types as they change. */
export function GuideNotice({
  requiresGuide,
  readOnly = false,
}: {
  requiresGuide: boolean;
  /** View-only screens state the fact without asking to upload. */
  readOnly?: boolean;
}) {
  const { kinds } = useKinds();
  const hasGuide = Object.values(kinds).includes("guia_remision");
  if (!requiresGuide || hasGuide) return null;
  return (
    <div
      role="status"
      className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <GuideStatusBadge status="missing" />
      <span>
        {readOnly
          ? "Esta factura aún no tiene su guía de remisión."
          : "Esta factura necesita su guía de remisión. Súbela aquí o, si ya está entre los adjuntos, cambia su tipo a «Guía de remisión»."}
      </span>
    </div>
  );
}
