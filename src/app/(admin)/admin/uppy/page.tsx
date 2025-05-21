"use client";

import React, { useRef } from "react";
import Uppy from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";
import FileInput from "@uppy/file-input";

export default function Page() {
  const textInput = useRef(null);

  const uppy = React.useMemo(() => {
    return new Uppy({
      autoProceed: true,
      debug: true,
    })
      .use(FileInput, { target: textInput.current || undefined })
      .use(AwsS3, {
        endpoint:
          process.env.NEXT_PUBLIC_MINIO_ENDPOINT || "http://localhost:9000",
        getUploadParameters: async (file) => {
          // Generate a signed URL for the file upload
          // This is a placeholder; you should implement your own logic to get the signed URL
          // accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",

          return {
            method: "PUT",
            url: `${process.env.NEXT_PUBLIC_MINIO_ENDPOINT}/${process.env.NEXT_PUBLIC_MINIO_BUCKET_NAME}/${file.name}`,
            fields: {},
          };
        },
      });
  }, []);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) {
      return;
    }

    const files = Array.from(event.target.files);

    files.forEach((file) => {
      try {
        uppy.addFile({
          source: "file input",
          name: file.name,
          type: file.type,
          data: file,
        });
      } catch {
        // handle other errors
        console.error("err");
      }
    });
  };

  return (
    <div>
      <h1>Upload to MinIO with Uppy</h1>
      <input
        type="file"
        ref={textInput}
        id="drag-drop"
        onChange={handleUpload}
      />
    </div>
  );
}
