// app/api/minio/upload/route.ts (or pages/api/minio/upload.js with module config)
import * as Minio from "minio";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

const minioEndpoint = "dicoms.loca.lt"; // port: 443
// const minioEndpoint = "localhost";

//localhost, 9000, false
//dicoms.loca.lt, 443, true

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
    const formData = await request.formData();
    const fileEntry = formData.get("file");
    let filename: string | null = null;

    if (fileEntry instanceof File) {
      filename = fileEntry.name;
      const buffer = await fileEntry.arrayBuffer();
      const stream = Readable.from(Buffer.from(buffer));
      const fileSize = buffer.byteLength;
      const contentType = fileEntry.type;

      await minioClient.putObject(bucketName, filename, stream, fileSize, {
        "Content-Type": contentType,
      });

      const publicUrl = await minioClient.presignedGetObject(
        bucketName,
        filename,
        604800
      );
      return NextResponse.json({ publicUrl }, { status: 200 });
    } else {
      return NextResponse.json(
        { error: "No file provided in the form data" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error uploading to MinIO:", error);
    return NextResponse.json(
      { error: "Failed to upload file." },
      { status: 500 }
    );
  }
}
