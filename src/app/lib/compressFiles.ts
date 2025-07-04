import JSZip from "jszip";
import { getFirstDicomPatientNameFromFiles } from "./getFirstDicomPatientNameFromFiles";
import { sanitize } from "./sanitize";

type CompressionProgressCallback = (percent: number, currentFile: string) => void;

export const compressFiles = async (
  files: File[],
  onProgress?: CompressionProgressCallback,
): Promise<File | null> => {
  if (!files || files.length === 0) {
    console.warn("No files provided for compression.");
    return null;
  }

  const zip = new JSZip();

  let firstDicomPatientNamePromise: Promise<string | undefined>;
  try {
    firstDicomPatientNamePromise = getFirstDicomPatientNameFromFiles(files);
  } catch (error) {
    console.error("Error getting DICOM patient name:", error);
    firstDicomPatientNamePromise = Promise.resolve("compressed_files");
  }

  for (const file of files) {
    zip.file(file.name, file);
  }

  try {
    const rawPatientName = await firstDicomPatientNamePromise;
    const firstDicomPatientName = rawPatientName || "dicom_archive";
    const sanitizedFileName = sanitize(`${firstDicomPatientName}.zip`);

    const compressionLevel = 6;

    const compressedBlob = await zip.generateAsync(
      {
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: {
          level: compressionLevel,
        },
      },
      (metadata) => {
        if (onProgress && metadata.currentFile) {
          onProgress(metadata.percent, metadata.currentFile);
        }
      },
    );

    const compressedFile = new File([compressedBlob], sanitizedFileName, {
      type: "application/zip",
    });
    return compressedFile;
  } catch (error) {
    console.error("Error during ZIP file generation:", error);
    return null;
  }
};
