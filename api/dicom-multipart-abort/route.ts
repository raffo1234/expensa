/**
 * /api/dicom-multipart-abort/route.ts
 * Aborts an incomplete multipart upload on R2.
 * Called when a multipart upload fails to clean up partial data
 * and avoid storage charges for incomplete uploads.
 *
 * POST /api/dicom-multipart-abort
 * Body: { path: string, uploadId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { S3Client, AbortMultipartUploadCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

export async function POST(req: NextRequest) {
  let path: string;
  let uploadId: string;

  try {
    const body = await req.json();
    path = body?.path;
    uploadId = body?.uploadId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!path || typeof path !== "string") {
    return NextResponse.json({ error: "Missing or invalid path" }, { status: 400 });
  }
  if (!uploadId || typeof uploadId !== "string") {
    return NextResponse.json({ error: "Missing or invalid uploadId" }, { status: 400 });
  }
  if (path.includes("..") || path.startsWith("/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const command = new AbortMultipartUploadCommand({
      Bucket: BUCKET,
      Key: path,
      UploadId: uploadId,
    });

    await r2.send(command);

    return NextResponse.json({ success: true });
  } catch (err) {
    // Aborting a non-existent upload is not a fatal error
    console.warn("[dicom-multipart-abort] Warning:", err);
    return NextResponse.json({ success: false, warning: "Abort may have already completed" });
  }
}
