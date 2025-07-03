import { DicomMetadata } from "@/types/dicomMetadata";
import { ExtractedFilesObject } from "./decompress";
import dicomParser from "dicom-parser"; // Or dcmjs, etc.
import { FIELD_TAGS } from "@/constants";

interface DicomFileWithMetadata {
  file: File;
  metadata: DicomMetadata;
}

export async function getStudyInstanceUID(file: File): Promise<string | undefined> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const byteArray = new Uint8Array(arrayBuffer);

    const isDicom =
      byteArray.length >= 132 &&
      byteArray[128] === 0x44 &&
      byteArray[129] === 0x49 &&
      byteArray[130] === 0x43 &&
      byteArray[131] === 0x4d;

    if (!isDicom) return undefined;

    const dataSet = dicomParser.parseDicom(byteArray);

    const uid = dataSet.string("x0020000d"); // StudyInstanceUID

    return uid?.trim();
  } catch (error) {
    console.error("Error extracting Study UID:", error);
    return undefined;
  }
}

export async function extractDicomMetadata(
  dicomFile: File
): Promise<DicomMetadata | undefined> {
  try {
    const arrayBuffer = await dicomFile.arrayBuffer();
    const byteArray = new Uint8Array(arrayBuffer);
    const dataSet = dicomParser.parseDicom(byteArray);

    for (const tag in dataSet.elements) {
      const val = dataSet.string(tag);
      console.log(`${tag}: ${val}`);
    }

    const result: Record<string, string | undefined> = {};

    for (const [field, tags] of Object.entries(FIELD_TAGS)) {
      for (const tag of tags) {
        const value = dataSet.string(tag)?.trim();
        if (value) {
          result[field] = value;
          break;
        }
      }
    }

    return result as DicomMetadata;
  } catch (error) {
    console.error("Error parsing DICOM metadata:", error);
    return undefined;
  }
}

export async function findAllDicomFilesWithDifferentStudyUID(
  extractedFilesObject: ExtractedFilesObject
): Promise<DicomFileWithMetadata[]> {
  const allDicomFilesWithDescriptions: {
    file: File;
    studyUID: string | undefined;
  }[] = [];

  async function traverse(obj: ExtractedFilesObject | File) {
    if (obj instanceof File) {
      const studyUID = await getStudyInstanceUID(obj);
      allDicomFilesWithDescriptions.push({ file: obj, studyUID });
    } else if (typeof obj === "object" && obj !== null) {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          await traverse(obj[key]);
        }
      }
    }
  }

  await traverse(extractedFilesObject);

  const validDicomFiles = allDicomFilesWithDescriptions.filter(
    (item) => item.studyUID !== undefined
  );
  const uniqueStudies = new Set(
    validDicomFiles.map((item) => item.studyUID)
  );

  const result: DicomFileWithMetadata[] = [];
  for (const studyUID of uniqueStudies) {
    const firstFileWithDescription = validDicomFiles.find(
      (item) => item.studyUID === studyUID
    );
    if (firstFileWithDescription) {
      const metadata = await extractDicomMetadata(
        firstFileWithDescription.file
      );
      if (metadata) {
        result.push({ file: firstFileWithDescription.file, metadata });
      }
    }
  }

  return result;
}
