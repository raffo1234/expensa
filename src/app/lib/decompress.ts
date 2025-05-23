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
    if (!file.dir) {
      extractedFiles[filename] = new File([await file.async("blob")], filename);
    } else {
      // For directories, we can represent them as an empty object for now
      extractedFiles[filename] = {};
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
