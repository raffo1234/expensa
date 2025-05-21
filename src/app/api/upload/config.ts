import { type NextUploadConfig } from "next-upload/client";
import { NextUpload } from "next-upload";

export const config: NextUploadConfig = {
  maxSize: "1mb",
  bucket: NextUpload.bucketFromEnv("dicoms"),
  client: {
    region: "us-west-1",
    endpoint: "http://localhost:9000", // or process.env.MINIO_ENDPOINT
    credentials: {
      secretAccessKey: "minioadmin",
      accessKeyId: "minioadmin",
    },
  },
};
