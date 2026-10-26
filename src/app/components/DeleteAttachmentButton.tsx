"use client";

import { useInvalidateExpenseLists } from "@/hooks/useInvalidateExpenseLists";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import DeleteButton from "./DeleteButton";
import { deleteAttachment } from "@/actions/expenses";

/**
 * Deletes one attachment from the expense detail, after a confirmation.
 * The server action checks the caller can access the expense before deleting
 * the file and its record; the page then refreshes to drop the tile.
 */
export default function DeleteAttachmentButton({
  attachmentId,
  fileName,
}: {
  attachmentId: string;
  fileName: string;
}) {
  const router = useRouter();
  const invalidateLists = useInvalidateExpenseLists();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const { error } = await deleteAttachment(attachmentId);
    if (error) {
      toast.error("No se pudo eliminar el adjunto. Inténtalo de nuevo.");
      setIsDeleting(false);
      return;
    }
    toast.success("Adjunto eliminado");
    // Stays busy until the refreshed page removes this tile.
    invalidateLists(); // lists show the new documents status when reopened
    router.refresh();
  };

  return (
    <DeleteButton
      onClick={handleDelete}
      isDeleting={isDeleting}
      title="Eliminar adjunto"
      confirmTitle="¿Eliminar adjunto?"
      confirmDescription={`Se eliminará "${fileName}" de forma permanente.`}
      confirmLabel="Eliminar"
      cancelLabel="Cancelar"
      classNames="shadow-sm"
    />
  );
}
