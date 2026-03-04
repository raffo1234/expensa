/**
 * /api/dicom-multipart-create/route.ts
 * Initiates a multipart upload on R2 and returns the uploadId.
 *
 * POST /api/dicom-multipart-create
 * Body: { path: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { S3Client, CreateMultipartUploadCommand } from "@aws-sdk/client-s3";

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

  try {
    const body = await req.json();
    path = body?.path;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!path || typeof path !== "string") {
    return NextResponse.json({ error: "Missing or invalid path" }, { status: 400 });
  }

  if (path.includes("..") || path.startsWith("/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const command = new CreateMultipartUploadCommand({
      Bucket: BUCKET,
      Key: path,
      ContentType: "application/dicom",
      // Server-side encryption if configured
      ...(process.env.CLOUDFLARE_R2_SSE_ALGORITHM
        ? { ServerSideEncryption: process.env.CLOUDFLARE_R2_SSE_ALGORITHM as "aws:kms" | "AES256" }
        : {}),
    });

    const result = await r2.send(command);

    if (!result.UploadId) {
      throw new Error("R2 did not return an UploadId");
    }

    return NextResponse.json({ uploadId: result.UploadId });
  } catch (err) {
    console.error("[dicom-multipart-create] Error:", err);
    return NextResponse.json(
      { error: "Failed to initiate multipart upload" },
      { status: 500 },
    );
  }
}
