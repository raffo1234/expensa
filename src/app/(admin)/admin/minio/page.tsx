"use client";

import { useState } from "react";

export default function Page() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState("");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus("Please select a file.");
      return;
    }

    setUploadStatus("Uploading...");

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result?.toString().split(",")[1];
        if (base64String) {
          const filename = selectedFile.name;

          const response = await fetch("/api/minio", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ filename, fileContent: base64String }),
          });

          const data = await response.json();
          console.log(data);
          setUploadStatus(data.message || data.error);
        } else {
          setUploadStatus("Error reading file.");
        }
      };
      reader.onerror = () => {
        setUploadStatus("Error reading file.");
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("Upload failed.");
    }
  };

  return (
    <div>
      <h1>Upload File to MinIO</h1>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={!selectedFile}>
        Upload
      </button>
      {uploadStatus && <p>{uploadStatus}</p>}
    </div>
  );
}
