// app/api/minio/upload/route.ts (or pages/api/minio/upload.js with module config)
// import * as Minio from "minio";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// const minioEndpoint =
//   "f876-2800-200-e2e0-3c-d8e7-2db3-7def-db35.ngrok-free.app"; // port: 443
// const minioEndpoint = "localhost";

//localhost, 9000, false
//dicoms.loca.lt, 443, true

// const minioClient = new Minio.Client({
//   endPoint: process.env.MINIO_ENDPOINT || minioEndpoint,
//   port: parseInt(process.env.MINIO_PORT || "9000"),
//   useSSL: process.env.MINIO_USE_SSL === "true" || false,
//   accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
//   secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
// });

// const bucketName = "dicoms"; // Replace with your bucket name

export async function POST() {
  try {
    // const { filename } = await request.json();
    const uploadId = uuidv4(); // Generate a unique upload ID
    return NextResponse.json({ uploadId }, { status: 200 });
  } catch (error) {
    console.error("Error initiating multipart upload:", error);
    return NextResponse.json(
      { error: "Failed to initiate upload" },
      { status: 500 }
    );
  }
}
