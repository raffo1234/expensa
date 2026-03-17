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
  pixelSpacing?: [number, number];
  imageOrientation?: [number, number, number, number, number, number];
  imagePosition?: [number, number, number];
  sliceThickness?: number;
  windowCenter?: number;
  windowWidth?: number;
  rescaleIntercept?: number;
  rescaleSlope?: number;
  rescaleType?: string;
  samplesPerPixel?: number;
  photometricInterpretation?: string;
  numberOfFrames?: number;
}

const NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const cleanString = (val: string | undefined) => val?.replace(/[\0\s]+$/g, "").trim();

/**
 * Converts WindowCenter/WindowWidth from physical units to pixel space.
 *
 * Some ADC series store window values in physical units (mm²/s, m²/s)
 * instead of pixel values. The viewer needs pixel space values.
 *
 * Examples from ADC series:
 *   eADC:        WC=0.48,           RescaleSlope=2.67e-7  → needs conversion
 *   ADC (mm²/s): WC=0.002,          RescaleSlope=1e-6     → needs conversion
 *   ADC (m²/s):  WC=0.000000002,    RescaleSlope=1e-12    → needs conversion
 *   ADC (10^-6): WC=2046,           RescaleSlope=1        → already correct
 *   MR standard: WC=500,            RescaleSlope=1        → already correct
 *
 * Detection: if |WindowCenter| < 1 and RescaleSlope is defined and != 1
 * then values are in physical units and need to be converted.
 */
const normalizeWindowToPixelSpace = (
  windowCenter: number | undefined,
  windowWidth: number | undefined,
  rescaleSlope: number | undefined,
  rescaleIntercept: number | undefined,
): { windowCenter: number | undefined; windowWidth: number | undefined } => {
  if (windowCenter === undefined || windowWidth === undefined) {
    return { windowCenter, windowWidth };
  }

  const slope = rescaleSlope ?? 1;
  const intercept = rescaleIntercept ?? 0;

  // If values are already in pixel space (>= 1), no conversion needed
  if (Math.abs(windowCenter) >= 1) {
    return { windowCenter, windowWidth };
  }

  // Values are in physical units — slope is effectively 0 or 1 with no rescale
  if (slope === 0 || slope === 1) {
    return { windowCenter, windowWidth };
  }

  // Convert physical → pixel space
  // pixel = (physical - intercept) / slope
  const normalizedCenter = Math.round((windowCenter - intercept) / slope);
  const normalizedWidth = Math.round(windowWidth / slope);

  return {
    windowCenter: normalizedCenter,
    windowWidth: normalizedWidth,
  };
};

export async function getDICOMMetadata(file: Blob): Promise<DicomMetadata | null> {
  try {
    const buffer = await file.arrayBuffer();
    const byteArray = new Uint8Array(buffer);
    const dataset = dicomParser.parseDicom(byteArray);

    const studyUID = cleanString(dataset.string("x0020000d")) || "unknown_study";

    const parseTagToNumbers = (tag: string): number[] | undefined => {
      const val = dataset.string(tag);
      if (!val) return undefined;
      return val
        .split("\\")
        .map((n) => {
          const parsed = parseFloat(n);
          return Number(parsed.toFixed(6));
        })
        .filter((n) => !isNaN(n));
    };

    const safeFloat = (tag: string, fallback?: number): number | undefined => {
      const val = dataset.string(tag);
      if (!val) return fallback;
      const parsed = parseFloat(val);
      return isNaN(parsed) ? fallback : parsed;
    };

    const orientation = parseTagToNumbers("x00200037") as
      | [number, number, number, number, number, number]
      | undefined;
    const position = parseTagToNumbers("x00200032") as [number, number, number] | undefined;
    const spacing = parseTagToNumbers("x00280030") as [number, number] | undefined;
    const thickness = safeFloat("x00180050");

    const rescaleSlope = safeFloat("x00281053");
    const rescaleIntercept = safeFloat("x00281052");

    // Extract raw window values from DICOM tags
    const rawWindowCenter = safeFloat("x00281050");
    const rawWindowWidth = safeFloat("x00281051");

    // ✅ Normalize to pixel space — fixes ADC series appearing black
    const { windowCenter, windowWidth } = normalizeWindowToPixelSpace(
      rawWindowCenter,
      rawWindowWidth,
      rescaleSlope,
      rescaleIntercept,
    );

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

      pixelSpacing: spacing,
      imageOrientation: orientation,
      imagePosition: position,
      sliceThickness: thickness,

      // ✅ Normalized window values — correct for all ADC types
      windowCenter,
      windowWidth,
      rescaleIntercept,
      rescaleSlope,
      rescaleType: cleanString(dataset.string("x00281054")),
      samplesPerPixel: dataset.uint16("x00280002") ?? 1,
      photometricInterpretation: cleanString(dataset.string("x00280004")) ?? "MONOCHROME2",
      numberOfFrames: parseInt(dataset.string("x00280008") || "1"),
    };
  } catch (error) {
    console.error("Error al parsear DICOM:", error);
    return null;
  }
}
