"use client";

import React, { useState, useRef, ChangeEvent } from "react";

export default function Page() {
  const [selectedFile, setSelectedFile] = useState<File | null>();
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files || [];
    setSelectedFile(selectedFiles[0]);
    setUploadProgress(0); // Reset progress on file selection
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select a file.");
      return;
    }

    setUploadStatus("Generating upload URL...");
    setUploadError("");
    setUploadProgress(0);

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

  const uploadFileToR2 = (url: string, file: File) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url, true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadStatus("Upload to Cloudflare R2 successful!");
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          setSelectedFile(null);
          resolve(xhr.responseText);
        } else {
          setUploadError(`Upload to Cloudflare R2 failed: ${xhr.statusText}`);
          setUploadStatus("");
          reject(xhr.statusText);
        }
      };

      xhr.onerror = () => {
        setUploadError(
          "Upload to Cloudflare R2 failed due to a network error."
        );
        setUploadStatus("");
        reject("Network Error");
      };

      xhr.send(file);
    });
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
        disabled={
          !selectedFile || uploadStatus === "Uploading to Cloudflare R2..."
        }
      >
        {uploadStatus || "Upload"}
      </button>
      {uploadError && <p style={{ color: "red" }}>Error: {uploadError}</p>}
      {uploadStatus && uploadStatus !== "Uploading to Cloudflare R2..." && (
        <p>{uploadStatus}</p>
      )}
      {uploadStatus === "Uploading to Cloudflare R2..." && (
        <div>
          <p>Upload Progress: {uploadProgress}%</p>
          <progress value={uploadProgress} max="100" />
        </div>
      )}
    </div>
  );
}
