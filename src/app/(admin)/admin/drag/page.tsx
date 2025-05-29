"use client";

import React, { useCallback, useState } from "react";
import { useDropzone, FileRejection } from "react-dropzone";

interface FileSystemEntry {
  isDirectory: boolean;
  isFile: boolean;
  name: string;
  fullPath: string;
  file: (callback: (file: File) => void) => void;
  getMetadata: (
    successCallback: (metadata: any) => void,
    errorCallback?: (error: any) => void
  ) => void;
  getParent: (
    successCallback: (parent: FileSystemDirectoryEntry) => void,
    errorCallback?: (error: any) => void
  ) => void;
}

interface FileSystemDirectoryEntry extends FileSystemEntry {
  isDirectory: true;
  createReader: () => FileSystemDirectoryReader;
}

interface FileSystemDirectoryReader {
  readEntries: (
    successCallback: (entries: FileSystemEntry[]) => void,
    errorCallback?: (error: any) => void
  ) => void;
}

function DropzoneWithFolder() {
  const [rootFolderName, setRootFolderName] = useState<string | null>(null);
  const onDrop = useCallback(
    (
      acceptedFiles: File[],
      fileRejections: FileRejection[],
      event: React.DragEvent<HTMLDivElement>
    ) => {
      const droppedItems = event.dataTransfer.items;
      let folderName: string | null = null;

      if (droppedItems) {
        for (let i = 0; i < droppedItems.length; i++) {
          const item = droppedItems[i];
          const entry = (
            item as any
          ).webkitGetAsEntry() as FileSystemEntry | null;

          if (entry && entry.isDirectory) {
            console.log(`Root folder name detected: ${entry.name}`);
            folderName = entry.name;
            break; // Assuming only one root folder is dropped at a time
          } else if (item.kind === "file") {
            const file = acceptedFiles.find(
              (f) => f.name === item.getAsFile()?.name
            );
            if (file) {
              console.log(`Dropped file named: ${file.name}`);
            }
          }
        }
        setRootFolderName(folderName);
      }
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div>
      <div
        {...getRootProps({
          className: `dropzone ${isDragActive ? "active" : ""}`,
        })}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the folder here ...</p>
        ) : (
          <p>Drag and drop a folder or file here</p>
        )}
      </div>
      {rootFolderName && <p>Root Folder Name: {rootFolderName}</p>}
    </div>
  );
}

export default DropzoneWithFolder;
