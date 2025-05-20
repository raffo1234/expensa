"use client";
import React, { useState, useRef } from "react";

export default function LargeFileUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [publicUrl, setPublicUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0] || null);
    setUploadStatus(""); // Reset upload status message
    setPublicUrl(""); // Reset public URL display
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus("Please select a file.");
      return;
    }

    setUploadStatus("Uploading...");
    setPublicUrl("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/minio/upload-large", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.publicUrl) {
        setPublicUrl(data.publicUrl);
        setUploadStatus("Upload complete!");
      } else {
        setUploadStatus("Upload failed.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("Upload failed.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSelectedFile(null);
    }
  };

  return (
    <div>
      <h1>Large File Upload to MinIO</h1>
      <input type="file" onChange={handleFileChange} ref={fileInputRef} />
      <button
        onClick={handleUpload}
        disabled={!selectedFile || uploadStatus !== ""}
      >
        Upload
      </button>
      {uploadStatus && <p>Status: {uploadStatus}</p>}
      {publicUrl && (
        <p>
          Public URL:{" "}
          <a href={publicUrl} target="_blank" rel="noopener noreferrer">
            {publicUrl}
          </a>
        </p>
      )}
    </div>
  );
}
