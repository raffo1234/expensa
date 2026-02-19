import uploadFileToR2 from "./uploadFileToR2";

/**
 * Orchestrator para la subida de cortes DICOM.
 * Se encarga de obtener la firma y ejecutar el PUT hacia R2.
 */
export default async function uploadDicomProcessor(
  fileBlob: Blob,
  structuredPath: string,
  onProgress: (progress: number) => void,
) {
  try {
    // 1. Obtener la Presigned URL desde tu API
    // Enviamos el path completo (ej. "dicom/STUDY_UID/...")
    const response = await fetch("/api/generate-dicom-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filename: structuredPath }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Error en el API de firmas");
    }

    const { signedUrl } = await response.json();

    if (!signedUrl) {
      throw new Error("La respuesta del servidor no incluyó signedUrl");
    }

    // 2. Ejecutar la subida física al bucket de Cloudflare
    // Usamos el helper uploadFileToR2 que ya maneja la lógica de fetch/XHR
    const uploadResult = await uploadFileToR2(signedUrl, fileBlob as File, onProgress);

    return uploadResult;
  } catch (error) {
    console.error("❌ [uploadDicomProcessor Error]:", error);
    return null;
  }
}
