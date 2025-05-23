import { ExtractedFilesObject } from "./decompress";
import dicomParser from "dicom-parser"; // Or dcmjs, etc.

interface DicomFileWithMetadata {
  file: File;
  metadata: DicomMetadata;
}

interface DicomMetadata {
  patientName?: string;
  patientId?: string;
  patientAge?: string;
  studyDescription?: string;
  modality?: string;
  studyDate?: string;
  patientSex?: string;
  patientBirthDate?: string;
  institutionName?: string;
}

async function getStudyDescription(file: File): Promise<string | undefined> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const byteArray = new Uint8Array(arrayBuffer);
    if (
      byteArray.length >= 132 &&
      byteArray[128] === 0x44 &&
      byteArray[129] === 0x49 &&
      byteArray[130] === 0x43 &&
      byteArray[131] === 0x4d
    ) {
      const dataSet = dicomParser.parseDicom(byteArray);
      return dataSet.string("x00081030");
    }
    return undefined;
  } catch (error) {
    console.error("Error parsing DICOM file:", error);
    return undefined;
  }
}

async function extractDicomMetadata(
  dicomFile: File
): Promise<DicomMetadata | undefined> {
  try {
    const arrayBuffer = await dicomFile.arrayBuffer();
    const byteArray = new Uint8Array(arrayBuffer);
    const dataSet = dicomParser.parseDicom(byteArray);

    return {
      patientName: dataSet.string("x00100010"),
      patientId: dataSet.string("x00100020"),
      patientAge: dataSet.string("x00101010"),
      studyDescription: dataSet.string("x00081030"),
      modality: dataSet.string("x00080060"),
      studyDate: dataSet.string("x00080020"),
      patientSex: dataSet.string("x00100040"),
      patientBirthDate: dataSet.string("x00100030"),
      institutionName: dataSet.string("x00080080"),
    };
  } catch (error) {
    console.error("Error parsing DICOM metadata:", error);
    return undefined;
  }
}

export async function findAllDicomFilesWithDifferentStudyDescriptions(
  extractedFilesObject: ExtractedFilesObject
): Promise<DicomFileWithMetadata[]> {
  const allDicomFilesWithDescriptions: {
    file: File;
    description: string | undefined;
  }[] = [];

  async function traverse(obj: ExtractedFilesObject | File) {
    if (obj instanceof File) {
      const description = await getStudyDescription(obj);
      allDicomFilesWithDescriptions.push({ file: obj, description });
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
    (item) => item.description !== undefined
  );
  const uniqueDescriptions = new Set(
    validDicomFiles.map((item) => item.description)
  );

  const result: DicomFileWithMetadata[] = [];
  for (const description of uniqueDescriptions) {
    const firstFileWithDescription = validDicomFiles.find(
      (item) => item.description === description
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
