import dicomParser from "dicom-parser";
import { v5 as uuidv5 } from "uuid";

export interface DicomMetadata {
  studyInstanceUID: string;
  seriesInstanceUID: string;
  sopInstanceUID: string;
  sopClassUID: string;
  instanceNumber: string | undefined;
  patientName?: string;
  modality?: string;
  patientId?: string;
  patientAge?: string;
  studyDescription?: string;
  studyDate?: string;
  patientSex?: string;
  patientBirthDate?: string;
  institutionName?: string;
  seriesNumber?: string;
  seriesDescription?: string;
  // --- NUEVOS CAMPOS PARA EVITAR IMÁGENES NEGRAS ---
  rows?: number;
  columns?: number;
  bitsAllocated?: number;
  bitsStored?: number;
  highBit?: number;
  pixelRepresentation?: number;
}

const NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const cleanString = (val: string | undefined) => val?.replace(/[\0\s]+$/g, "").trim();

export async function getDICOMMetadata(file: Blob): Promise<DicomMetadata | null> {
  try {
    const buffer = await file.arrayBuffer();
    const byteArray = new Uint8Array(buffer);
    const dataset = dicomParser.parseDicom(byteArray);

    const studyUID = cleanString(dataset.string("x0020000d")) || "unknown_study";

    return {
      studyInstanceUID: studyUID,
      seriesInstanceUID:
        cleanString(dataset.string("x0020000e")) || `SYNTH_SERIES_${uuidv5(studyUID, NAMESPACE)}`,
      sopInstanceUID:
        cleanString(dataset.string("x00080018")) ||
        `SYNTH_SOP_${uuidv5(Date.now().toString(), NAMESPACE)}`,
      sopClassUID: cleanString(dataset.string("x00080016")) || "1.2.840.10008.5.1.4.1.1.7",
      instanceNumber: cleanString(dataset.string("x00200013")) || "1",
      patientName: cleanString(dataset.string("x00100010")),
      modality: cleanString(dataset.string("x00080060")) || "OT",
      patientId: cleanString(dataset.string("x00100020")),
      patientAge: cleanString(dataset.string("x00101010")),
      studyDescription: cleanString(dataset.string("x00081030")),
      studyDate: cleanString(dataset.string("x00080020")),
      patientSex: cleanString(dataset.string("x00100040")),
      patientBirthDate: cleanString(dataset.string("x00100030")),
      institutionName: cleanString(dataset.string("x00080080")),
      seriesNumber: dataset.string("x00200011"),
      seriesDescription: dataset.string("x0008103e"),
      // --- EXTRACCIÓN DE DATOS DE IMAGEN REALES ---
      rows: dataset.uint16("x00280010"),
      columns: dataset.uint16("x00280011"),
      bitsAllocated: dataset.uint16("x00280100"),
      bitsStored: dataset.uint16("x00280101"),
      highBit: dataset.uint16("x00280102"),
      pixelRepresentation: dataset.uint16("x00280103"),
    };
  } catch (error) {
    console.error("Error al parsear DICOM:", error);
    return null;
  }
}
