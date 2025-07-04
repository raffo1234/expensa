import JSZip from "jszip";

export interface ExtractedFilesObject {
  [name: string]: File | ExtractedFilesObject;
}

export async function processZipFile(selectedFile: File): Promise<ExtractedFilesObject> {
  const zip = new JSZip();
  const loadedZip: JSZip = await zip.loadAsync(selectedFile);
  const extractedFiles: ExtractedFilesObject = {};

  for (const filename in loadedZip.files) {
    const fileEntry = loadedZip.files[filename];

    if (fileEntry.dir && filename === "") {
      continue;
    }

    const pathParts = filename.split("/");
    let currentLevel: ExtractedFilesObject = extractedFiles;

    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!currentLevel[part]) {
        currentLevel[part] = {};
      }
      currentLevel = currentLevel[part] as ExtractedFilesObject;
    }

    const finalPart = pathParts[pathParts.length - 1];

    if (finalPart) {
      if (!fileEntry.dir) {
        const fileBlob = await fileEntry.async("blob");
        const newFile = new File([fileBlob], finalPart, {
          type: fileBlob.type || "application/octet-stream",
        });
        currentLevel[finalPart] = newFile;
      } else {
        if (!currentLevel[finalPart]) {
          currentLevel[finalPart] = {};
        }
      }
    }
  }

  return extractedFiles;
}
