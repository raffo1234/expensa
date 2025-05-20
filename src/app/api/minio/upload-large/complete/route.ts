// app/api/minio/upload/route.ts (or pages/api/minio/upload.js with module config)
import * as Minio from "minio";
import { NextRequest, NextResponse } from "next/server";

// const minioEndpoint =
//   "f876-2800-200-e2e0-3c-d8e7-2db3-7def-db35.ngrok-free.app"; // port: 443
const minioEndpoint = "localhost";

//localhost, 9000, false
//dicoms.loca.lt, 443, true

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || minioEndpoint,
  port: parseInt(process.env.MINIO_PORT || "9000"),
  useSSL: process.env.MINIO_USE_SSL === "true" || false,
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
});

const bucketName = "dicoms"; // Replace with your bucket name

export async function POST(request: NextRequest) {
  try {
    const { uploadId, filename, parts } = await request.json();

    if (!uploadId || !filename || !parts || !Array.isArray(parts)) {
      return NextResponse.json(
        { error: "Invalid parameters for completion" },
        { status: 400 }
      );
    }

    const sourceList: Minio.CopySourceOptions[] = parts.map((partNumber) => {
      return new Minio.CopySourceOptions({
        Bucket: bucketName,
        Object: `${filename}-${uploadId}-${partNumber}`,
      });
    });

    const destOption = new Minio.CopyDestinationOptions({
      Bucket: bucketName,
      Object: filename,
    });

    await minioClient.composeObject(destOption, sourceList);

    // Clean up the individual parts
    const objectsToRemove = sourceList.map((source) => source.Object);
    await minioClient.removeObjects(bucketName, objectsToRemove);

    const publicUrl = await minioClient.presignedGetObject(
      bucketName,
      filename,
      3600
    );
    return NextResponse.json({ publicUrl }, { status: 200 });
  } catch (error) {
    console.error("Error completing multipart upload:", error);
    return NextResponse.json(
      { error: "Failed to complete upload" },
      { status: 500 }
    );
  }
}
