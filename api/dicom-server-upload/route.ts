/**
 * /api/dicom-server-upload/route.ts
 * Server-side upload fallback.
 * When the browser client upload fails repeatedly, this route receives
 * the file via multipart form and streams it directly to R2 from the server.
 * Bypasses browser restrictions (CORS, connection limits, memory).
 *
 * POST /api/dicom-server-upload
 * Body: FormData { file: Blob, path: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

// Next.js 13+ App Router — disable default body size limit for file uploads
export const config = {
  api: { bodyParser: false },
};

// Raise the limit for large DICOM files (default is 4MB)
export const maxDuration = 60; // seconds

export async function POST(req: NextRequest) {
  let formData: FormData;

  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Failed to parse form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const path = formData.get("path") as string | null;

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing or invalid file" }, { status: 400 });
  }
  if (!path || typeof path !== "string") {
    return NextResponse.json({ error: "Missing or invalid path" }, { status: 400 });
  }
  if (path.includes("..") || path.startsWith("/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: path,
      Body: buffer,
      ContentType: "application/dicom",
      ContentLength: buffer.byteLength,
    });

    await r2.send(command);

    return NextResponse.json({
      success: true,
      path,
      size: buffer.byteLength,
    });
  } catch (err) {
    console.error("[dicom-server-upload] R2 upload error:", err);
    return NextResponse.json(
      { error: "Server-side upload to R2 failed" },
      { status: 500 },
    );
  }
}
