"use client";

import { useInvalidateExpenseLists } from "@/hooks/useInvalidateExpenseLists";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { SELECT_CLASS } from "@/constants";
import { setAttachmentKind } from "@/actions/expenses";
import {
  ATTACHMENT_KINDS,
  ATTACHMENT_KIND_LABELS,
  docsStatus,
  type AttachmentKind,
} from "@/lib/expenseDocs";
import DocsStatusBadge from "./DocsStatusBadge";

// Optimistic attachment types for the expense detail: a change shows at once
// (in the select AND in the documents notice), is saved in the background, and is
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
  const invalidateLists = useInvalidateExpenseLists();
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
        invalidateLists(); // lists show the new documents status when reopened
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

/** Spanish list: "A", "A y B", "A, B y C". */
const listOf = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`;

/**
 * Which required documents (factura, guía, comprobante) this invoice still
 * lacks, following the attachment types as they change.
 */
export function DocsNotice({
  invoice,
  readOnly = false,
}: {
  /** Invoice fields that decide whether the documents rule applies. */
  invoice: Parameters<typeof docsStatus>[0];
  /** View-only screens state the fact without asking to upload. */
  readOnly?: boolean;
}) {
  const { kinds } = useKinds();
  const status = docsStatus(invoice, Object.values(kinds));
  if (status.state !== "pending") return null;
  const names = listOf(status.missing.map((k) => ATTACHMENT_KIND_LABELS[k].toLowerCase()));
  return (
    <div
      role="status"
      className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <DocsStatusBadge status={status} />
      <span>
        {readOnly
          ? `Esta factura aún no tiene: ${names}.`
          : `Falta adjuntar: ${names}. Súbelo aquí o, si ya está entre los adjuntos, cambia su tipo.`}
      </span>
    </div>
  );
}
