import { NextRequest, NextResponse } from "next/server";
import { S3Client, HeadObjectCommand, NoSuchKey, S3ServiceException } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  if (path.includes("..") || path.startsWith("/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET,
      Key: path,
    });

    const result = await r2.send(command);

    return NextResponse.json({
      exists: true,
      size: result.ContentLength ?? 0,
      lastModified: result.LastModified?.toISOString(),
      contentType: result.ContentType,
    });
  } catch (err: unknown) {
    // Eliminamos el 'any'. AWS SDK v3 usa S3ServiceException para errores de red/servicio.
    if (err instanceof NoSuchKey || (err as S3ServiceException).name === "NotFound") {
      return NextResponse.json({ exists: false, size: 0 });
    }

    // Manejo de errores de autenticación o configuración (Riesgo Crítico)
    if (err instanceof S3ServiceException && err.name === "InvalidAccessKeyId") {
      console.error("[CRITICAL] R2 Credentials are invalid");
    }

    console.error("[dicom-verify] R2 HeadObject error:", err);
    return NextResponse.json({ error: "Failed to verify file in R2" }, { status: 500 });
  }
}
