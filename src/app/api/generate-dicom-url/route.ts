import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { filename } = await req.json(); // Recibe: "dicom/UID/..."

    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
    const r2Endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
    const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

    if (!bucketName || !r2Endpoint || !r2AccessKeyId || !r2SecretAccessKey) {
      return NextResponse.json({ error: "R2 configuration missing" }, { status: 500 });
    }

    const client = new S3Client({
      endpoint: r2Endpoint,
      region: "auto",
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
      },
      requestChecksumCalculation: "WHEN_REQUIRED", // ✅ disables automatic CRC32
      responseChecksumValidation: "WHEN_REQUIRED", // ✅ same for responses
    });

    // 🚨 CAMBIO SENIOR: Usamos 'filename' directamente como 'Key'
    // El frontend ya envía la ruta estructurada: dicom/STUDY_UID/...
    // Si dejamos el `dicom/` aquí, se crearía: dicom/dicom/UID...
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      ContentType: "application/dicom", // Ayuda al visor a identificar el tipo de archivo
    });

    // La firma debe coincidir exactamente con el Key para evitar el Error 500
    const signedUrl = await getSignedUrl(client, command, { expiresIn: 600 });

    return NextResponse.json({ signedUrl });
  } catch (error) {
    console.error("❌ R2 Signing Error:", error);
    return NextResponse.json({ error: "Failed to generate presigned URL." }, { status: 500 });
  }
}
