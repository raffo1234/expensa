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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename") as string;
    const uploadId = searchParams.get("uploadId") as string;
    const partNumber = parseInt(searchParams.get("partNumber") as string);

    const presignedUrl = await minioClient.presignedPutObject(
      bucketName,
      filename,
      60 * 60
     
    );

    // Return the presigned URL along with uploadId and partNumber information
    return NextResponse.json(
      { presignedUrl, uploadId, partNumber },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json(
      { error: "Failed to generate presigned URL" },
      { status: 500 }
    );
  }
}
