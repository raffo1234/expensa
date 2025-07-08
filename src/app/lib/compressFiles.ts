import { zip, AsyncZipOptions } from "fflate";
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

  let firstDicomPatientNamePromise: Promise<string | undefined>;
  try {
    firstDicomPatientNamePromise = getFirstDicomPatientNameFromFiles(files);
  } catch (error) {
    console.error("Error getting DICOM patient name:", error);
    firstDicomPatientNamePromise = Promise.resolve("compressed_files");
  }

  const fileMap: { [key: string]: Uint8Array | [Uint8Array, AsyncZipOptions] } = {};
  const fileArrayBuffersPromises: Promise<void>[] = [];

  const compressionLevel: AsyncZipOptions["level"] = 6;

  for (const file of files) {
    fileArrayBuffersPromises.push(
      (async () => {
        const arrayBuffer = await file.arrayBuffer();
        fileMap[file.name] = [new Uint8Array(arrayBuffer), { level: compressionLevel }];
      })(),
    );
  }

  await Promise.all(fileArrayBuffersPromises);

  try {
    const rawPatientName = await firstDicomPatientNamePromise;
    const firstDicomPatientName = rawPatientName || "dicom_archive";
    const sanitizedFileName = sanitize(`${firstDicomPatientName}.zip`);

    return new Promise((resolve, reject) => {
      zip(fileMap, {}, (err, data) => {
        if (err) {
          console.error("Error during fflate ZIP file generation:", err);
          return reject(err);
        }

        const compressedBlob = new Blob([data], { type: "application/zip" });

        const compressedFile = new File([compressedBlob], sanitizedFileName, {
          type: "application/zip",
        });

        if (onProgress) {
          onProgress(100, sanitizedFileName);
        }

        resolve(compressedFile);
      });
    });
  } catch (error) {
    console.error("Error during fflate ZIP file preparation or generation:", error);
    return null;
  }
};
