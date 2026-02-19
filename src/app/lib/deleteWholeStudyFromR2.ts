// src/services/dicom-storage.ts
import { DeleteObjectsCommand, paginateListObjectsV2, S3Client } from "@aws-sdk/client-s3";

// Definimos el tipo de retorno para consistencia en toda la app
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

export const deleteWholeStudyFromR2 = async (studyUID: string): Promise<R2DeleteResponse> => {
  if (!studyUID) {
    return { success: false, error: "No studyUID provided" };
  }

  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  const prefix = `dicom/${studyUID}/`;

  try {
    const keysToDelete: { Key: string }[] = [];

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
      return { success: true, count: 0 };
    }

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

    console.log(`✅ R2: Eliminados ${keysToDelete.length} archivos del estudio ${studyUID}`);
    return { success: true, count: keysToDelete.length };
  } catch (error: unknown) {
    // Eliminamos 'any' y validamos el error de forma segura
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("❌ Error al eliminar de R2:", errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
};
