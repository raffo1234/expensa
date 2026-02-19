import dicomParser from "dicom-parser";
import { v5 as uuidv5 } from "uuid";

export interface DicomMetadata {
  studyInstanceUID: string;
  seriesInstanceUID: string;
  sopInstanceUID: string;
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
}

const NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

export async function getDICOMMetadata(file: Blob): Promise<DicomMetadata | null> {
  try {
    const buffer = await file.arrayBuffer();
    const byteArray = new Uint8Array(buffer);
    const dataset = dicomParser.parseDicom(byteArray);

    return {
      studyInstanceUID:
        dataset.string("x0020000d") ||
        dataset.string("x00080050") ||
        dataset.string("x00200010") ||
        dataset.string("x00401001") ||
        "unknown_instance_uid",
      seriesInstanceUID:
        dataset.string("x0020000e") ||
        `SYNTH_SERIES_${uuidv5(dataset.string("x0020000d") || "missing", NAMESPACE)}`,
      sopInstanceUID:
        dataset.string("x00080018") || `SYNTH_SOP_${uuidv5(Date.now().toString(), NAMESPACE)}`,
      instanceNumber: dataset.string("x00200013") || dataset.string("x00200012") || "1",
      patientName: dataset.string("x00100010"),
      modality: dataset.string("x00080060"),
      patientId: dataset.string("x70051024") || dataset.string("x00100020"),
      patientAge: dataset.string("x00101010"),
      studyDescription:
        dataset.string("x00081030") || dataset.string("x00181030") || dataset.string("x7005100d"),
      studyDate: dataset.string("x00080020"),
      patientSex: dataset.string("x00100040"),
      patientBirthDate: dataset.string("x00100030"),
      institutionName: dataset.string("x00080080"),
    };
  } catch (error) {
    console.error("Error técnico al parsear DICOM:", error);
    return null;
  }
}
