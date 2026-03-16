/**
 * dicomWorkerUtils.ts
 * CF Worker-compatible versions of parseDicomMetadata, buildStudy, buildInstance.
 * Accepts Uint8Array directly — no Blob/arrayBuffer() needed in Worker runtime.
 */

import dicomParser from "dicom-parser";
import { v5 as uuidv5 } from "uuid";
import { differenceInWeeks, differenceInMonths } from "date-fns";
import { toZonedTime } from "date-fns-tz";

// --- TYPES (mirrors DicomInstance from processDicomStudyTurbo) ---

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

export interface DicomInstance {
    sop_instance_uid: string;
    series_instance_uid: string;
    instance_number: number;
    storage_url: string;
    sop_class_uid: string;
    series_number: number;
    series_description: string;
    rows: number;
    columns: number;
    bits_allocated: number;
    bits_stored: number;
    slice_thickness?: number;
    high_bit: number;
    pixel_representation: number;
    pixel_spacing?: [number, number];
    image_orientation?: [number, number, number, number, number, number];
    image_position?: [number, number, number];
    window_center?: number;
    window_width?: number;
    rescale_intercept?: number;
    rescale_slope?: number;
    rescale_type?: string;
    samples_per_pixel?: number;
    photometric_interpretation?: string;
    number_of_frames?: number;
}

export interface DicomStudy {
    study_instance_uid: string;
    user_id: string;
    modality: string;
    instances: DicomInstance[];
    patient_name: string;
    patient_id: string;
    study_description: string;
    study_date: string;
    patient_age: string;
    gender: string;
    birthday: string;
    institution: string;
}

// --- HELPERS ---

const NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const cleanString = (val: string | undefined) => val?.replace(/[\0\s]+$/g, "").trim();

const parseTagToNumbers = (
    dataset: dicomParser.DataSet,
    tag: string
): number[] | undefined => {
    const val = dataset.string(tag);
    if (!val) return undefined;
    return val
        .split("\\")
        .map((n) => Number(parseFloat(n).toFixed(6)))
        .filter((n) => !isNaN(n));
};

const safeFloat = (
    dataset: dicomParser.DataSet,
    tag: string,
    fallback?: number
): number | undefined => {
    const val = dataset.string(tag);
    if (!val) return fallback;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? fallback : parsed;
};

// --- getAgeFromYYYYMMDD — identical logic, inlined for Worker ---

const formatAge = ({ years, months, weeks }: { years: number; months: number; weeks: number }) => {
    if (isNaN(years)) return "Invalid Date";
    if (years >= 1) return years.toString().padStart(3, "0") + "Y";
    if (months >= 1) return months.toString().padStart(3, "0") + "M";
    if (!isNaN(weeks)) return weeks.toString().padStart(3, "0") + "W";
    return "000W";
};

const getAgeFromYYYYMMDD = (dateString: string): string => {
    if (!dateString || dateString.length !== 8 || !/^\d+$/.test(dateString)) {
        return "Invalid Date";
    }

    const birthYear = parseInt(dateString.substring(0, 4));
    const birthMonth = parseInt(dateString.substring(4, 6));
    const birthDay = parseInt(dateString.substring(6, 8));

    const now = toZonedTime(new Date(), "America/Lima");
    const birthDate = new Date(birthYear, birthMonth - 1, birthDay);

    const years = now.getFullYear() - birthDate.getFullYear();
    const months = differenceInMonths(now, birthDate) - years * 12;
    const weeks = differenceInWeeks(now, birthDate);

    return formatAge({ years, months, weeks });
};

// --- PARSE ---
// ✅ Accepts Uint8Array directly — no Blob in CF Worker runtime

export const parseDicomMetadata = (buffer: Uint8Array): DicomMetadata | null => {
    try {
        const dataset = dicomParser.parseDicom(buffer);

        const studyUID = cleanString(dataset.string("x0020000d")) || "unknown_study";

        const orientation = parseTagToNumbers(dataset, "x00200037") as
            | [number, number, number, number, number, number]
            | undefined;
        const position = parseTagToNumbers(dataset, "x00200032") as
            | [number, number, number]
            | undefined;
        const spacing = parseTagToNumbers(dataset, "x00280030") as [number, number] | undefined;

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
            sliceThickness: safeFloat(dataset, "x00180050"),

            windowCenter: safeFloat(dataset, "x00281050"),
            windowWidth: safeFloat(dataset, "x00281051"),
            rescaleIntercept: safeFloat(dataset, "x00281052"),
            rescaleSlope: safeFloat(dataset, "x00281053"),
            rescaleType: cleanString(dataset.string("x00281054")),
            samplesPerPixel: dataset.uint16("x00280002") ?? 1,
            photometricInterpretation:
                cleanString(dataset.string("x00280004")) ?? "MONOCHROME2",
            numberOfFrames: parseInt(dataset.string("x00280008") || "1"),
        };
    } catch (error) {
        console.error("[parseDicomMetadata] Parse error:", error);
        return null;
    }
};

// --- BUILD STUDY ---

export const buildStudy = (metadata: DicomMetadata, userId: string): DicomStudy => {
    const age =
        metadata.patientAge || getAgeFromYYYYMMDD(metadata.patientBirthDate || "");

    return {
        study_instance_uid: metadata.studyInstanceUID,
        user_id: userId,
        modality: metadata.modality || "OT",
        instances: [],
        patient_name: metadata.patientName || "Unknown",
        patient_id: metadata.patientId || "Unknown",
        study_description: metadata.studyDescription || "",
        study_date: metadata.studyDate || "",
        patient_age: String(age),
        gender: metadata.patientSex || "O",
        birthday: metadata.patientBirthDate || "",
        institution: metadata.institutionName || "",
    };
};

// --- BUILD INSTANCE ---

export const buildInstance = (
    metadata: DicomMetadata,
    storageUrl: string
): DicomInstance => ({
    sop_instance_uid: metadata.sopInstanceUID,
    series_instance_uid: metadata.seriesInstanceUID,
    instance_number: metadata.instanceNumber || 0,
    storage_url: storageUrl,
    sop_class_uid: metadata.sopClassUID,
    series_number: metadata.seriesNumber || 1,
    series_description: metadata.seriesDescription || "",
    rows: metadata.rows || 512,
    columns: metadata.columns || 512,
    bits_allocated: metadata.bitsAllocated || 16,
    bits_stored: metadata.bitsStored || 16,
    high_bit: metadata.highBit || 15,
    pixel_representation: metadata.pixelRepresentation || 0,
    slice_thickness: metadata.sliceThickness,
    pixel_spacing: metadata.pixelSpacing,
    image_orientation: metadata.imageOrientation,
    image_position: metadata.imagePosition,
    window_center: metadata.windowCenter,
    window_width: metadata.windowWidth,
    rescale_intercept: metadata.rescaleIntercept,
    rescale_slope: metadata.rescaleSlope,
    rescale_type: metadata.rescaleType,
    samples_per_pixel: metadata.samplesPerPixel,
    photometric_interpretation: metadata.photometricInterpretation,
    number_of_frames: metadata.numberOfFrames,
});