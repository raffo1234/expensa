import JSZip from "jszip";

export interface ExtractedFilesObject {
  [name: string]: File | ExtractedFilesObject;
}

export async function processZipFile(
  selectedFile: File
): Promise<ExtractedFilesObject> {
  const zip = new JSZip();
  const loadedZip: JSZip = await zip.loadAsync(selectedFile);
  const extractedFiles: ExtractedFilesObject = {};

  for (const filename in loadedZip.files) {
    const file = loadedZip.files[filename];
    const pathParts = filename.split("/");
    let currentLevel = extractedFiles;

    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!currentLevel[part]) {
        currentLevel[part] = {};
      }
      currentLevel = currentLevel[part] as ExtractedFilesObject;
    }

    const finalPart = pathParts[pathParts.length - 1];
    if (finalPart) {
      if (!file.dir) {
        currentLevel[finalPart] = new File(
          [await file.async("blob")],
          finalPart
        );
      } else {
        if (!currentLevel[finalPart]) {
          currentLevel[finalPart] = {};
        }
      }
    } else if (file.dir && filename === "") {
      // Handle the specific case of a root directory entry with an empty name
      if (!currentLevel[""]) {
        currentLevel[""] = {};
      }
    }
  }

  return extractedFiles;
}

export async function readZipFile(file: File): Promise<string[]> {
  try {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    return Object.keys(contents.files)
      .filter((filename) => !contents.files[filename].dir)
      .map((filename) => filename);
  } catch (error) {
    console.error("Error reading ZIP file:", error);
    return [];
  }
}
