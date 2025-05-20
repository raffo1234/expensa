// app/api/minio/upload/route.ts (or pages/api/minio/upload.js with module config)
import * as Minio from "minio";
import { NextRequest, NextResponse } from "next/server";

const minioEndpoint = "dicoms.loca.lt";

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || minioEndpoint,
  port: parseInt(process.env.MINIO_PORT || "443"),
  useSSL: process.env.MINIO_USE_SSL === "true" || true,
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

const bucketName = "dicoms"; // Replace with your bucket name

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { filename, fileContent } = requestBody;

    // Ensure the bucket exists
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) {
      await minioClient.makeBucket(bucketName, "us-east-1"); // Replace 'us-east-1' with your desired region
    }

    // Upload the file (assuming fileContent is a base64 string)
    const buffer = Buffer.from(fileContent, "base64");
    await minioClient.putObject(bucketName, filename, buffer);

    // Get a presigned URL for the uploaded file (valid for 7 days - 604800 seconds)
    const publicUrl = await minioClient.presignedGetObject(
      bucketName,
      filename,
      604800
    );

    return NextResponse.json({ message: publicUrl }, { status: 200 });
  } catch (error) {
    console.error("Error uploading to MinIO:", error);
    return NextResponse.json(
      { error: "Failed to upload file." },
      { status: 500 }
    );
  }
}
