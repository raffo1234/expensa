// app/api/generate-r2-url/route.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { filename } = await req.json();
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
    const r2Endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
    const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

    if (!bucketName || !r2Endpoint || !r2AccessKeyId || !r2SecretAccessKey) {
      return NextResponse.json(
        {
          error:
            "Cloudflare R2 configuration not found in environment variables.",
        },
        { status: 500 }
      );
    }

    const client = new S3Client({
      endpoint: r2Endpoint,
      region: "auto", // Cloudflare R2 doesn't require a specific region
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
      },
    });

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: `dicom/${filename}`,
    });

    const signedUrl = await getSignedUrl(client, command, { expiresIn: 600 }); // URL expires in 10 minutes

    return NextResponse.json({ signedUrl });
  } catch (error) {
    console.error("Error generating presigned URL for Cloudflare R2:", error);
    return NextResponse.json(
      { error: "Failed to generate presigned URL." },
      { status: 500 }
    );
  }
}
