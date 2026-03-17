/**
 * /api/generate-dicom-urls-batch/route.ts
 * Returns presigned PUT URLs for multiple files in one call.
 * Replaces N individual presign round trips with 1 batch call.
 *
 * POST /api/generate-dicom-urls-batch
 * Body: { filenames: string[] }
 * Response: { urls: Record<string, string> }
 */

import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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
const URL_EXPIRY_SECONDS = 3600;
const MAX_BATCH = 100; // safety cap

export async function POST(req: NextRequest) {
  let filenames: string[];

  try {
    const body = await req.json();
    filenames = body?.filenames;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(filenames) || filenames.length === 0) {
    return NextResponse.json({ error: "Missing or empty filenames array" }, { status: 400 });
  }

  if (filenames.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `Batch size exceeds maximum of ${MAX_BATCH}` },
      { status: 400 },
    );
  }

  // Validate all paths
  for (const filename of filenames) {
    if (typeof filename !== "string" || filename.includes("..") || filename.startsWith("/")) {
      return NextResponse.json({ error: `Invalid path: ${filename}` }, { status: 400 });
    }
  }

  try {
    // Generate all signed URLs in parallel
    const entries = await Promise.all(
      filenames.map(async (filename) => {
        const command = new PutObjectCommand({
          Bucket: BUCKET,
          Key: filename,
          ContentType: "application/dicom",
        });
        const url = await getSignedUrl(r2, command, { expiresIn: URL_EXPIRY_SECONDS });
        return [filename, url] as [string, string];
      }),
    );

    const urls = Object.fromEntries(entries);
    return NextResponse.json({ urls });
  } catch (err) {
    console.error("[generate-dicom-urls-batch] Error:", err);
    return NextResponse.json({ error: "Failed to generate signed URLs" }, { status: 500 });
  }
}
