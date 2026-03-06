/**
 * /api/generate-dicom-urls-batch/route.ts
 * Generates up to 50 presigned PUT URLs in a single request.
 * Replaces 400 individual /api/generate-dicom-url calls with ~8 batch calls.
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";

const BATCH_LIMIT = 50;

export async function POST(req: NextRequest) {
  try {
    const { filenames }: { filenames: string[] } = await req.json();

    if (!Array.isArray(filenames) || filenames.length === 0) {
      return NextResponse.json({ error: "filenames must be a non-empty array" }, { status: 400 });
    }

    if (filenames.length > BATCH_LIMIT) {
      return NextResponse.json(
        { error: `Max ${BATCH_LIMIT} filenames per batch` },
        { status: 400 },
      );
    }

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
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });

    // Generate all URLs in parallel — SDK calls are cheap server-side
    const entries = await Promise.all(
      filenames.map(async (filename) => {
        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: filename,
          ContentType: "application/dicom",
        });
        const signedUrl = await getSignedUrl(client, command, { expiresIn: 600 });
        return [filename, signedUrl] as [string, string];
      }),
    );

    // Return as a map: { "dicom/uid/file.dcm": "https://r2.signed.url/..." }
    const urls = Object.fromEntries(entries);

    return NextResponse.json({ urls });
  } catch (error) {
    console.error("❌ Batch presign error:", error);
    return NextResponse.json({ error: "Failed to generate presigned URLs." }, { status: 500 });
  }
}
