/**
 * /api/dicom-verify/route.ts
 * Verifies a file exists in R2 with a valid size.
 * Called after every upload to confirm R2 actually received the file.
 *
 * GET /api/dicom-verify?path=dicom/userId/studyUID/seriesUID/sopUID.dcm
 */

import { NextRequest, NextResponse } from "next/server";
import { S3Client, HeadObjectCommand, NoSuchKey } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!, // e.g. https://<accountid>.r2.cloudflarestorage.com
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

  // Basic path validation — prevent directory traversal
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
    // NoSuchKey = file doesn't exist — not an error, just not there yet
    if (err instanceof NoSuchKey || (err as any)?.name === "NotFound") {
      return NextResponse.json({ exists: false, size: 0 });
    }

    console.error("[dicom-verify] R2 HeadObject error:", err);
    return NextResponse.json(
      { error: "Failed to verify file in R2" },
      { status: 500 },
    );
  }
}
