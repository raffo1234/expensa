// app/api/minio/upload/route.ts (or pages/api/minio/upload.js with module config)
import * as Minio from "minio";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

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
    const formData = await request.formData();
    const uploadId = formData.get("uploadId") as string;
    const partNumber = parseInt(formData.get("partNumber") as string);
    const filename = formData.get("filename") as string;
    const filePart = formData.get("file") as unknown as File; // Type assertion

    if (!uploadId || isNaN(partNumber) || !filePart || !filename) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 }
      );
    }

    console.log("Filename:", filename); // Add this line

    const buffer = await filePart.arrayBuffer();
    const stream = Readable.from(Buffer.from(buffer));
    const fileSize = buffer.byteLength;
    const contentType = filePart.type;

    const objectName = `${filename}-${uploadId}-${partNumber}`;
    await minioClient.putObject(bucketName, objectName, stream, fileSize, {
      "Content-Type": contentType,
    });

    return NextResponse.json(
      { message: "Part uploaded successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error uploading part:", error);
    return NextResponse.json(
      { error: "Failed to upload part" },
      { status: 500 }
    );
  }
}
