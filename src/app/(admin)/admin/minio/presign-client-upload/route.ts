// backend/app/api/minio/presign-client-upload/route.ts
import * as Minio from "minio";
import { NextRequest, NextResponse } from "next/server";

// Initialize MinIO client with environment variables configured on Vercel
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT!, // Ensure MINIO_ENDPOINT is set in Vercel environment variables
  port: parseInt(process.env.MINIO_PORT || "9000"), // Optional: Set default port
  useSSL: process.env.MINIO_USE_SSL === "true" || false, // Optional: Enable SSL if your MinIO server uses it
  accessKey: process.env.MINIO_ACCESS_KEY!, // Ensure MINIO_ACCESS_KEY is set
  secretKey: process.env.MINIO_SECRET_KEY!, // Ensure MINIO_SECRET_KEY is set
});

const bucketName = process.env.MINIO_BUCKET_NAME || "your-bucket-name"; // Optional: Default bucket name

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename") as string;
    const uploadId = searchParams.get("uploadId") as string;
    const partNumber = searchParams.get("partNumber") as string;

    if (!filename) {
      return NextResponse.json(
        { error: "Filename is required" },
        { status: 400 }
      );
    }

    // For large files, include uploadId and partNumber for multipart uploads
    const reqParams =
      uploadId && partNumber
        ? { uploadId, partNumber: parseInt(partNumber) }
        : {};

    const presignedUrl = await minioClient.presignedPutObject(
      bucketName,
      filename,
      60 * 60, // URL expires in 1 hour (adjust as needed)
      reqParams
    );

    return NextResponse.json({ presignedUrl }, { status: 200 });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json(
      { error: "Failed to generate presigned URL" },
      { status: 500 }
    );
  }
}
