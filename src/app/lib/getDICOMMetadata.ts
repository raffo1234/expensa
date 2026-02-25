import dicomParser from "dicom-parser";
import { v5 as uuidv5 } from "uuid";

export interface DicomMetadata {
  studyInstanceUID: string;
  seriesInstanceUID: string;
  sopInstanceUID: string;
  sopClassUID: string;
  instanceNumber: number;
  patientName?: string;
  modality?: string;
  patientId?: string;
  patientAge?: string;
  studyDescription?: string;
  studyDate?: string;
  patientSex?: string;
  patientBirthDate?: string;
  institutionName?: string;
  seriesNumber: number;
  seriesDescription: string;
  rows: number;
  columns: number;
  bitsAllocated: number;
  bitsStored: number;
  highBit: number;
  pixelRepresentation: number;
  // Campos de diagnóstico corregidos
  pixelSpacing?: [number, number];
  imageOrientation?: [number, number, number, number, number, number];
  imagePosition?: [number, number, number];
  windowCenter?: number;
  windowWidth?: number;
  rescaleIntercept?: number;
  rescaleSlope?: number;
}

const NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const cleanString = (val: string | undefined) => val?.replace(/[\0\s]+$/g, "").trim();

export async function getDICOMMetadata(file: Blob): Promise<DicomMetadata | null> {
  try {
    const buffer = await file.arrayBuffer();
    const byteArray = new Uint8Array(buffer);
    const dataset = dicomParser.parseDicom(byteArray);

    const studyUID = cleanString(dataset.string("x0020000d")) || "unknown_study";

    // Helper seguro para parsear strings de DICOM a arrays numéricos
    const parseTagToNumbers = (tag: string): number[] | undefined => {
      const val = dataset.string(tag);
      if (!val) return undefined;
      return val
        .split("\\")
        .map((n) => parseFloat(n))
        .filter((n) => !isNaN(n));
    };

    return {
      studyInstanceUID: studyUID,
      seriesInstanceUID:
        cleanString(dataset.string("x0020000e")) || `SYN_SER_${uuidv5(studyUID, NAMESPACE)}`,
      sopInstanceUID:
        cleanString(dataset.string("x00080018")) ||
        `SYN_SOP_${uuidv5(Date.now().toString(), NAMESPACE)}`,
      sopClassUID: cleanString(dataset.string("x00080016")) || "1.2.840.10008.5.1.4.1.1.7",
      instanceNumber: parseInt(dataset.string("x00200013") || "1"),

      patientName: cleanString(dataset.string("x00100010")),

      patientId:
        cleanString(dataset.string("x70051024")) || cleanString(dataset.string("x00100020")),

      patientAge: cleanString(dataset.string("x00101010")),
      patientSex: cleanString(dataset.string("x00100040")),
      patientBirthDate: cleanString(dataset.string("x00100030")),
      studyDescription:
        cleanString(dataset.string("x00081030")) ||
        cleanString(dataset.string("x00181030")) ||
        cleanString(dataset.string("x7005100d")),

      studyDate: cleanString(dataset.string("x00080020")),
      institutionName: cleanString(dataset.string("x00080080")),
      modality: cleanString(dataset.string("x00080060")) || "OT",
      seriesNumber: parseInt(dataset.string("x00200011") || "1"),
      seriesDescription: cleanString(dataset.string("x0008103e")) || "",

      rows: dataset.uint16("x00280010") || 512,
      columns: dataset.uint16("x00280011") || 512,
      bitsAllocated: dataset.uint16("x00280100") || 16,
      bitsStored: dataset.uint16("x00280101") || 16,
      highBit: dataset.uint16("x00280102") || 15,
      pixelRepresentation: dataset.uint16("x00280103") || 0,

      pixelSpacing: parseTagToNumbers("x00280030") as [number, number] | undefined,
      imageOrientation: parseTagToNumbers("x00200037") as
        | [number, number, number, number, number, number]
        | undefined,
      imagePosition: parseTagToNumbers("x00200032") as [number, number, number] | undefined,

      windowCenter: parseFloat(dataset.string("x00281050") || ""),
      windowWidth: parseFloat(dataset.string("x00281051") || ""),
      rescaleIntercept: parseFloat(dataset.string("x00281052") || "0"),
      rescaleSlope: parseFloat(dataset.string("x00281053") || "1"),
    };
  } catch (error) {
    console.error("Error al parsear DICOM:", error);
    return null;
  }
}
