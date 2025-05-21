import { type NextUploadConfig } from "next-upload/client";
import { NextUpload } from "next-upload";

export const config: NextUploadConfig = {
  maxSize: "900mb",
  bucket: NextUpload.bucketFromEnv("dicoms"),
  client: {
    region: "us-west-1",
    endpoint:
      "https://a6ab-2800-200-e2e0-3c-d8e7-2db3-7def-db35.ngrok-free.app",
    credentials: {
      secretAccessKey: process.env.MINIO_ACCESS_KEY ?? "",
      accessKeyId: process.env.MINIO_SECRET_KEY ?? "",
    },
  },
};
