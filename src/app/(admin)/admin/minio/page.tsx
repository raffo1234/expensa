"use client";
import React, { useState, useRef } from "react";

const CHUNK_SIZE = 1024 * 1024 * 5; // 5MB chunk size

export default function LargeFileUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [publicUrl, setPublicUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0] || null);
    setUploadStatus("");
    setUploadProgress(0);
    setPublicUrl("");
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus("Please select a file.");
      return;
    }

    setUploadStatus("Initializing upload...");
    setUploadProgress(0);
    setPublicUrl("");

    try {
      const filename = selectedFile.name;
      const initResponse = await fetch("/api/minio/upload-large/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      const { uploadId } = await initResponse.json();

      const totalChunks = Math.ceil(selectedFile.size / CHUNK_SIZE);
      const uploadedParts = [];

      setUploadStatus("Uploading parts...");

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, selectedFile.size);
        const chunk = selectedFile.slice(start, end);
        const partNumber = i + 1;

        const formData = new FormData();
        formData.append("uploadId", uploadId);
        formData.append("partNumber", String(partNumber));
        formData.append("filename", filename);
        formData.append("file", chunk);

        const partResponse = await fetch("/api/minio/upload-large/part", {
          method: "POST",
          body: formData,
        });

        if (partResponse.ok) {
          uploadedParts.push(partNumber);
          setUploadProgress(Math.round((partNumber / totalChunks) * 100));
        } else {
          console.error(`Failed to upload part ${partNumber}`, partResponse);
          setUploadStatus(`Failed to upload part ${partNumber}`);
          return;
        }
      }

      setUploadStatus("Completing upload...");
      const completeResponse = await fetch("/api/minio/upload-large/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId, filename, parts: uploadedParts }),
      });

      if (completeResponse.ok) {
        const { publicUrl: finalPublicUrl } = await completeResponse.json();
        setPublicUrl(finalPublicUrl);
        setUploadStatus("Upload complete!");
      } else {
        setUploadStatus("Failed to complete upload.");
        console.error("Failed to complete upload", completeResponse);
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
      <h1>Large File Upload to MinIO (Multipart)</h1>
      <input type="file" onChange={handleFileChange} ref={fileInputRef} />
      <button
        onClick={handleUpload}
        disabled={!selectedFile || uploadStatus !== ""}
      >
        Upload
      </button>
      {uploadStatus && <p>Status: {uploadStatus}</p>}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <p>Progress: {uploadProgress}%</p>
      )}
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
