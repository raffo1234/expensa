"use client";

import { useInvalidateExpenseLists } from "@/hooks/useInvalidateExpenseLists";
import { useRef, useState, useTransition, type DragEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ICON_SIZE } from "@/constants";
import { uploadExpenseAttachment } from "@/lib/uploadExpenseAttachment";
import { Spinner } from "./SubmitButton";

// Same file types the server accepts for attachments.
const isAllowed = (f: File) => f.type.startsWith("image/") || f.type === "application/pdf";

/**
 * The expense's attachment grid plus an "add" tile. Files can be dropped
 * anywhere on the grid or picked by clicking the tile. Uploads use the same
 * signed, access-checked flow as the expense forms, then the page refreshes.
 */
export default function AttachmentDropArea({
  expenseId,
  empty,
  children,
}: {
  expenseId: string;
  /** No attachments yet: the add tile takes the whole row. */
  empty: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const invalidateLists = useInvalidateExpenseLists();
  const inputRef = useRef<HTMLInputElement>(null);
  // dragenter/dragleave also fire for child elements; count them so the
  // highlight doesn't flicker while moving over the tiles.
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number[] | null>(null);
  const [refreshing, startRefresh] = useTransition();

  const busy = progress !== null || refreshing;
  const percent = progress?.length
    ? Math.round(progress.reduce((a, b) => a + b, 0) / progress.length)
    : 0;

  const upload = async (picked: File[]) => {
    if (busy || !picked.length) return;
    const files = picked.filter(isAllowed);
    if (files.length < picked.length) toast.error("Solo se pueden adjuntar imágenes o PDF.");
    if (!files.length) return;

    const controller = new AbortController();
    setProgress(files.map(() => 0));
    const results = await Promise.allSettled(
      files.map((file, i) =>
        uploadExpenseAttachment(
          file,
          expenseId,
          (pct) => setProgress((prev) => prev && prev.map((p, j) => (j === i ? pct : p))),
          controller.signal,
        ),
      ),
    );

    const failed = results.filter((r) => r.status === "rejected").length;
    const done = files.length - failed;
    if (done) toast.success(done === 1 ? "Adjunto agregado" : `${done} adjuntos agregados`);
    if (failed) {
      toast.error(
        failed === 1
          ? "No se pudo subir 1 archivo. Inténtalo de nuevo."
          : `No se pudieron subir ${failed} archivos. Inténtalo de nuevo.`,
      );
    }
    invalidateLists(); // lists show the new documents status when reopened
    // Stay busy until the refreshed page shows the new tiles.
    startRefresh(() => {
      router.refresh();
      setProgress(null);
    });
  };

  const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes("Files");

  return (
    <div
      onDragEnter={(e) => {
        if (!hasFiles(e)) return;
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!hasFiles(e)) return;
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDragOver={(e) => {
        if (hasFiles(e)) e.preventDefault();
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        upload(Array.from(e.dataTransfer.files));
      }}
      className={`rounded-xl transition-shadow duration-200 ${
        dragging ? "ring-2 ring-violet-400 ring-offset-4" : ""
      }`}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {children}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-busy={busy}
          className={`flex h-full min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-wait ${
            empty ? "col-span-full" : ""
          } ${
            dragging
              ? "border-violet-400 bg-violet-50 text-violet-700"
              : "border-navy-200 text-navy-500 hover:border-violet-300 hover:bg-violet-50/50 hover:text-violet-700"
          }`}
        >
          {busy ? (
            <>
              <Spinner className="size-5 text-violet-500" />
              <span className="text-sm tabular-nums">
                {refreshing && !progress ? "Actualizando…" : `Subiendo… ${percent}%`}
              </span>
            </>
          ) : (
            <>
              <svg
                width={ICON_SIZE}
                height={ICON_SIZE}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 16V4m0 0-4 4m4-4 4 4" />
                <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
              <span className="text-sm">
                {dragging ? "Suelta para agregar" : "Arrastra archivos o haz clic"}
              </span>
              <span className="text-xs text-navy-400">Imágenes o PDF</span>
            </>
          )}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,application/pdf"
        hidden
        onChange={(e) => {
          upload(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </div>
  );
}
