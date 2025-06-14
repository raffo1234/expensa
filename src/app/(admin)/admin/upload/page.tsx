"use client";

import React, { useState, useRef, ChangeEvent } from "react";

export default function Page() {
  const [selectedFile, setSelectedFile] = useState<File | null>();
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files || [];
    setSelectedFile(selectedFiles[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select a file.");
      return;
    }

    setUploadStatus("Generating upload URL...");
    setUploadError("");

    try {
      const response = await fetch("/api/generate-r2-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename: selectedFile.name }),
      });

      const data = await response.json();

      if (response.ok && data?.signedUrl) {
        setUploadStatus("Uploading to Cloudflare R2...");
        await uploadFileToR2(data.signedUrl, selectedFile);
      } else {
        setUploadError(data?.error || "Failed to generate upload URL.");
        setUploadStatus("");
      }
    } catch (error) {
      console.error("Error getting presigned URL:", error);
      setUploadError("Failed to generate upload URL.");
      setUploadStatus("");
    }
  };

  const uploadFileToR2 = async (url: string, file: File) => {
    try {
      const uploadResponse = await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      if (uploadResponse.ok) {
        setUploadStatus("Upload to Cloudflare R2 successful!");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setSelectedFile(null);
      } else {
        const errorText = await uploadResponse.text();
        setUploadError(`Upload to Cloudflare R2 failed: ${errorText}`);
        setUploadStatus("");
      }
    } catch (error) {
      console.error("Error uploading to Cloudflare R2:", error);
      setUploadError("Upload to Cloudflare R2 failed.");
      setUploadStatus("");
    }
  };

  return (
    <div>
      <h1>Upload DICOM File to Cloudflare R2</h1>
      <input
        type="file"
        accept=".dcm, .zip, .gz"
        onChange={handleFileChange}
        ref={fileInputRef}
      />
      <button
        onClick={handleUpload}
        disabled={!selectedFile || uploadStatus !== ""}
      >
        {uploadStatus || "Upload"}
      </button>
      {uploadError && <p style={{ color: "red" }}>Error: {uploadError}</p>}
      {uploadStatus && <p>{uploadStatus}</p>}
    </div>
  );
}
