"use server";

import { deleteWholeStudyFromR2 } from "@/lib/deleteWholeStudyFromR2";
import { revalidatePath } from "next/cache";
import { supabase } from "./supabase";

export async function deleteFullStudyAction(studyUID: string, dicomId: string) {
  try {
    // 1. Borrar archivos en Cloudflare R2
    const r2Result = await deleteWholeStudyFromR2(studyUID);

    if (!r2Result?.success) {
      throw new Error(r2Result?.error || "Error al borrar archivos en R2");
    }

    // 2. Borrar record en Supabase
    const { error: dbError } = await supabase.from("dicom").delete().eq("id", dicomId);

    if (dbError) throw dbError;

    // 3. Refrescar la UI
    revalidatePath("/admin/dicoms");

    return { success: true, count: r2Result.count };
  } catch (error: unknown) {
    // 1. Cambiado a unknown por seguridad
    console.error("Delete Error:", error);

    // 2. Validación de instancia para extraer el mensaje
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido";

    return { success: false, error: errorMessage };
  }
}
