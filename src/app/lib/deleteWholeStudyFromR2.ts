import { DeleteObjectsCommand, paginateListObjectsV2, S3Client } from "@aws-sdk/client-s3";

export interface R2DeleteResponse {
  success: boolean;
  count?: number;
  error?: string;
}

const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

export const deleteWholeStudyFromR2 = async (
  studyUID: string,
  userId: string, // Nuevo parámetro obligatorio
): Promise<R2DeleteResponse> => {
  if (!studyUID || !userId) {
    return { success: false, error: "Missing studyUID or userId" };
  }

  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  // LA RUTA DEBE COINCIDIR CON: dicom/${userId}/${studyUID}/
  const prefix = `dicom/${userId}/${studyUID}/`;

  try {
    const keysToDelete: { Key: string }[] = [];

    // Usamos el paginador para manejar estudios de más de 1000 imágenes
    const paginator = paginateListObjectsV2(
      { client: r2Client },
      { Bucket: bucket, Prefix: prefix },
    );

    for await (const page of paginator) {
      if (page.Contents) {
        page.Contents.forEach((obj) => {
          if (obj.Key) keysToDelete.push({ Key: obj.Key });
        });
      }
    }

    if (keysToDelete.length === 0) {
      console.log(`⚠️ No se encontraron archivos en R2 para el prefijo: ${prefix}`);
      return { success: true, count: 0 };
    }

    // Borrado por chunks de 1000 (Límite de la API de S3/R2)
    const chunkSize = 1000;
    for (let i = 0; i < keysToDelete.length; i += chunkSize) {
      const chunk = keysToDelete.slice(i, i + chunkSize);

      await r2Client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: chunk,
            Quiet: true,
          },
        }),
      );
    }

    console.log(`✅ R2: Eliminados ${keysToDelete.length} archivos de ${prefix}`);
    return { success: true, count: keysToDelete.length };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("❌ Error al eliminar de R2:", errorMessage);
    return { success: false, error: errorMessage };
  }
};
