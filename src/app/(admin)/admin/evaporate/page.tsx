"use client";

import Evaporate from "evaporate";
import Crypto from "crypto"; // You might need a polyfill for crypto in the browser

const yourMinioEndpoint =
  process.env.NEXT_PUBLIC_MINIO_ENDPOINT || "http://localhost:9000";
const yourMinioAccessKey = process.env.MINIO_ACCESS_KEY || "minioadmin";
const yourMinioSecretKey = process.env.MINIO_SECRET_KEY || "minioadmin";
const yourMinioBucketName =
  process.env.NEXT_PUBLIC_MINIO_BUCKET_NAME || "dicoms";
const awsRegion = process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1"; // You might need to set a region

const config = {
  //   signerUrl: "/api/sign-s3", // Optional: If you use a backend to sign requests (more secure)
  aws_key: yourMinioAccessKey,
  bucket: yourMinioBucketName,
  awsRegion: awsRegion,
  endpoint: yourMinioEndpoint, // Specify the MinIO endpoint
  s3ForcePathStyle: true, // Likely needed for MinIO
  computeContentMd5: true,
  cryptoMd5Method: (data) =>
    Crypto.createHash("md5").update(data).digest("base64"),
  cryptoHexEncodedHash: false,
  maxConcurrentParts: 5,
  partSize: 6 * 1024 * 1024, // 6MB part size
  retryMultiple: 3,
  logging: true,
};

// const evaporate = new Evaporate(config);

// Now you can use the 'evaporate' instance to upload files.
// Example upload function:
// const uploadFileToMinio = async (file: File) => {
//   try {
//     const uploader = await evaporate.upload({
//       file: file,
//       name: file.name, // Or your desired object key in MinIO
//       // Other options as needed (e.g., progress, complete callbacks)
//     });
//     console.log("Upload successful:", uploader.getKey());
//   } catch (error) {
//     console.error("Error uploading to MinIO:", error);
//   }
// };

// You would then call uploadFileToMinio with the selected file from your input element.

// Example in your component:
export default function Page() {
  Evaporate.create(config).then(
    (evaporate) => {
      // Successfully created new instance of evaporate
      console.log("Evaporate initialized successfully", evaporate);

      // Example upload function
      // const uploadFileToMinio = async (file) => {
      //   try {
      //     const uploader = await evaporate.upload({
      //       file: file,
      //       name: file.name, // Or your desired object key in MinIO
      //       // Other options as needed (e.g., progress, complete callbacks)
      //     });
      //     console.log("Upload successful:", uploader.getKey());
      //   } catch (error) {
      //     console.error("Error uploading to MinIO:", error);
      //   }
      // };
    },

    // Failed to create new instance of evaporate
    function failure(reason) {
      console.log("Evaporate failed to initialize: ", reason);
    }
  );

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // uploadFileToMinio(file);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      {/* ... other UI elements */}
    </div>
  );
}
