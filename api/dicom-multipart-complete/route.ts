/**
 * /api/dicom-multipart-complete/route.ts
 * Completes a multipart upload by assembling all parts on R2.
 *
 * POST /api/dicom-multipart-complete
 * Body: { path: string, uploadId: string, parts: { partNumber: number, etag: string }[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { S3Client, CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

interface Part {
  partNumber: number;
  etag: string;
}

export async function POST(req: NextRequest) {
  let path: string;
  let uploadId: string;
  let parts: Part[];

  try {
    const body = await req.json();
    path = body?.path;
    uploadId = body?.uploadId;
    parts = body?.parts;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!path || typeof path !== "string") {
    return NextResponse.json({ error: "Missing or invalid path" }, { status: 400 });
  }
  if (!uploadId || typeof uploadId !== "string") {
    return NextResponse.json({ error: "Missing or invalid uploadId" }, { status: 400 });
  }
  if (!Array.isArray(parts) || parts.length === 0) {
    return NextResponse.json({ error: "Missing or empty parts array" }, { status: 400 });
  }
  if (path.includes("..") || path.startsWith("/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  // Validate each part has required fields
  for (const part of parts) {
    if (typeof part.partNumber !== "number" || !part.etag) {
      return NextResponse.json(
        { error: `Invalid part entry: ${JSON.stringify(part)}` },
        { status: 400 },
      );
    }
  }

  try {
    const command = new CompleteMultipartUploadCommand({
      Bucket: BUCKET,
      Key: path,
      UploadId: uploadId,
      MultipartUpload: {
        // R2 requires parts sorted by partNumber ascending
        Parts: parts
          .sort((a, b) => a.partNumber - b.partNumber)
          .map(({ partNumber, etag }) => ({
            PartNumber: partNumber,
            ETag: etag,
          })),
      },
    });

    const result = await r2.send(command);

    return NextResponse.json({
      success: true,
      location: result.Location,
      key: result.Key,
    });
  } catch (err) {
    console.error("[dicom-multipart-complete] Error:", err);
    return NextResponse.json(
      { error: "Failed to complete multipart upload" },
      { status: 500 },
    );
  }
}
