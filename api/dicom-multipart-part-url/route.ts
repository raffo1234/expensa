/**
 * /api/dicom-multipart-part-url/route.ts
 * Returns a presigned URL for uploading a single part of a multipart upload.
 *
 * POST /api/dicom-multipart-part-url
 * Body: { path: string, uploadId: string, partNumber: number }
 */

import { NextRequest, NextResponse } from "next/server";
import { S3Client, UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
const URL_EXPIRY_SECONDS = 3600; // 1 hour per part

export async function POST(req: NextRequest) {
  let path: string;
  let uploadId: string;
  let partNumber: number;

  try {
    const body = await req.json();
    path = body?.path;
    uploadId = body?.uploadId;
    partNumber = body?.partNumber;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!path || typeof path !== "string") {
    return NextResponse.json({ error: "Missing or invalid path" }, { status: 400 });
  }
  if (!uploadId || typeof uploadId !== "string") {
    return NextResponse.json({ error: "Missing or invalid uploadId" }, { status: 400 });
  }
  if (!partNumber || typeof partNumber !== "number" || partNumber < 1 || partNumber > 10000) {
    return NextResponse.json({ error: "Invalid partNumber (must be 1–10000)" }, { status: 400 });
  }
  if (path.includes("..") || path.startsWith("/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const command = new UploadPartCommand({
      Bucket: BUCKET,
      Key: path,
      UploadId: uploadId,
      PartNumber: partNumber,
    });

    const signedUrl = await getSignedUrl(r2, command, {
      expiresIn: URL_EXPIRY_SECONDS,
    });

    return NextResponse.json({ signedUrl });
  } catch (err) {
    console.error("[dicom-multipart-part-url] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate part presigned URL" },
      { status: 500 },
    );
  }
}
