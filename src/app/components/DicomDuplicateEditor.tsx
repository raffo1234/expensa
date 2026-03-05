"use client";

import { useState, useTransition, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import TextareaAutosize from "react-textarea-autosize";

interface Props {
  dicomId: string;
  initialComment: string;
  onClose: () => void;
  mutate: () => void;
}

export function DicomDuplicateEditor({ dicomId, initialComment, onClose, mutate }: Props) {
  // Inicializamos con el comentario o un string vacío por seguridad
  const [comment, setComment] = useState(initialComment || "");
  const [isPending, startTransition] = useTransition();

  // FIX: Sincronizar el estado si la prop cambia o si el modal se reutiliza
  useEffect(() => {
    setComment(initialComment || "");
  }, [initialComment, dicomId]);

  // VALIDACIÓN: Check si está vacío o solo tiene espacios
  const isInvalid = !comment.trim() || isPending;

  const handleDuplicate = () => {
    if (isInvalid) return; // Protección extra

    startTransition(async () => {
      try {
        const { data: original, error: fetchError } = await supabase
          .from("dicom")
          .select("*")
          .eq("id", dicomId)
          .single();

        if (fetchError || !original) throw new Error("Original study not found");

        // Limpieza de datos sensibles
        const { id, created_at, report, state, ...dataToDuplicate } = original;
        console.log({ id, created_at, report, state });
        const { error: insertError } = await supabase.from("dicom").insert([
          {
            ...dataToDuplicate,
            study_description: comment.trim(),
            is_duplicated: true,
            state: "",
          },
        ]);

        if (insertError) throw insertError;

        await mutate();
        toast.success("Study duplicated successfully");
        onClose();
      } catch (err) {
        console.error(err);
        toast.error("Failed to duplicate study");
      }
    });
  };

  return (
    <div className="p-1">
      <h1 className="font-semibold text-xl mb-1">Duplicate Study Description</h1>
      <p className="mb-6 text-gray-400 text-sm">Add study description for this copy</p>

      <TextareaAutosize
        autoFocus
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        minRows={3}
        placeholder="Study description..."
        className="bg-white w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 disabled:bg-gray-50"
        disabled={isPending}
      />

      <div className="flex justify-end gap-2 mt-6">
        <button
          onClick={onClose}
          type="button"
          className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleDuplicate}
          disabled={isInvalid}
          className={`px-4 py-2 rounded-lg text-white font-semibold transition-colors 
            ${isInvalid ? "bg-gray-300 cursor-not-allowed" : "bg-cyan-500 hover:bg-cyan-600"}`}
        >
          {isPending ? "Duplicating..." : "Confirm & Duplicate"}
        </button>
      </div>
    </div>
  );
}
