"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "./supabase";
import { auth } from "@/lib/auth"; // Helper de Auth.js v5
import { deleteWholeStudyFromR2 } from "./deleteWholeStudyFromR2";

/**
 * SERVER ACTION: Borrado integral de estudio DICOM
 * 1. Valida sesión en servidor (Auth.js)
 * 2. Valida propiedad del recurso en DB
 * 3. Limpia R2 (Ruta aislada por userId)
 * 4. Elimina de Supabase
 */
export async function deleteFullStudyAction(studyUID: string, dicomId: string) {
  try {
    // 1. Obtener sesión de forma segura en el servidor
    const session = await auth();

    // Verificación de identidad
    if (!session?.user?.id) {
      throw new Error("Sesión no válida o expirada. Por favor, inicia sesión.");
    }

    const userId = session.user.id;

    // 2. Seguridad Pre-vuelo: Verificar que el recurso pertenece al usuario
    // No confiamos solo en el dicomId enviado desde el cliente.
    const { data: study, error: fetchError } = await supabase
      .from("dicom")
      .select("user_id")
      .eq("id", dicomId)
      .single();

    if (fetchError || !study) {
      throw new Error("El estudio no existe o ya fue eliminado.");
    }

    if (study.user_id !== userId) {
      // Intento de borrado no autorizado (Posible ataque)
      console.warn(
        `⚠️ Intento de borrado no autorizado: User ${userId} trató de borrar recurso de User ${study.user_id}`,
      );
      throw new Error("No tienes permisos para realizar esta acción.");
    }

    // 3. Borrado en Cloudflare R2
    // IMPORTANTE: Usamos el userId de la sesión para construir el prefijo dicom/${userId}/${studyUID}/
    const r2Result = await deleteWholeStudyFromR2(studyUID, userId);

    if (!r2Result?.success) {
      // Si falla R2, abortamos para no perder la referencia en la DB y poder reintentar
      throw new Error(r2Result?.error || "Error crítico al limpiar archivos en el almacenamiento.");
    }

    // 4. Borrado en Supabase (Doble check de userId por seguridad)
    const { error: dbError } = await supabase
      .from("dicom")
      .delete()
      .eq("id", dicomId)
      .eq("user_id", userId);

    if (dbError) {
      throw new Error(`Error al eliminar registro: ${dbError.message}`);
    }

    // 5. Refrescar datos en el cliente
    revalidatePath("/admin/dicoms");

    return {
      success: true,
      count: r2Result.count,
      message: "Estudio eliminado correctamente de la base de datos y almacenamiento.",
    };
  } catch (error: unknown) {
    console.error("❌ [deleteFullStudyAction]:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar la eliminación.";

    return { success: false, error: errorMessage };
  }
}
