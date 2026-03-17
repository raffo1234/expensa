import { supabase } from "@/lib/supabase";
import { DicomTableRow } from "@/types/Dicom";
import { NextResponse } from "next/server";
import { DicomInstance } from "../../../../../workers/process-dicom/src/dicomWorkerUtils";

// --- WINDOW NORMALIZATION ---
// Fixes ADC series (eADC, ADC mm²/s, ADC m²/s) that store WindowCenter
// in physical units with tiny RescaleSlope — causing black images in OHIF.
//
// OHIF bug: when RescaleSlope < ~0.01, it ignores WindowCenter from JSON
// and recalculates VOI from raw pixel data with wrong windowing.
//
// Fix: pre-apply the rescale into WindowCenter/WindowWidth, then
// neutralize RescaleSlope=1 / RescaleIntercept=0 so OHIF doesn't double-apply.
const normalizeWindow = (
  windowCenter: number | undefined,
  windowWidth: number | undefined,
  rescaleSlope: number | undefined,
  rescaleIntercept: number | undefined,
): {
  windowCenter: number | undefined;
  windowWidth: number | undefined;
  rescaleSlope: number | undefined;
  rescaleIntercept: number | undefined;
} => {
  if (windowCenter === undefined || windowWidth === undefined) {
    return { windowCenter, windowWidth, rescaleSlope, rescaleIntercept };
  }

  const slope = rescaleSlope ?? 1;
  const intercept = rescaleIntercept ?? 0;

  // Slope is normal — pass through unchanged
  if (slope === 0 || slope === 1) {
    return { windowCenter, windowWidth, rescaleSlope, rescaleIntercept };
  }

  // Values are in physical units (sub-pixel) — convert to pixel space
  // OR slope is abnormally small — pre-apply to avoid OHIF double-apply bug
  const normalizedCenter =
    Math.abs(windowCenter) < 1
      ? Math.round((windowCenter - intercept) / slope) // physical → pixel
      : windowCenter; // already pixel space, keep as-is

  const normalizedWidth =
    Math.abs(windowCenter) < 1 ? Math.round(windowWidth / slope) : windowWidth;

  return {
    windowCenter: normalizedCenter,
    windowWidth: normalizedWidth,
    // ✅ Neutralize slope so OHIF doesn't rescale again
    rescaleSlope: 1,
    rescaleIntercept: 0,
  };
};

// Interfaces
interface OHIFInstance {
  metadata: {
    SOPInstanceUID: string;
    InstanceNumber: number;
    SOPClassUID: string;
    Rows: number;
    Columns: number;
    SamplesPerPixel: number;
    PhotometricInterpretation: string;
    BitsAllocated: number;
    BitsStored: number;
    HighBit: number;
    PixelRepresentation: number;
    ImagePositionPatient: number[];
    ImageOrientationPatient: number[];
    PixelSpacing: number[];
    SliceThickness: number;
    SpacingBetweenSlices: number;
    WindowCenter?: number;
    WindowWidth?: number;
    RescaleIntercept?: number;
    RescaleSlope?: number;
    RescaleType?: string;
    NumberOfFrames?: number;
  };
  url: string;
}

interface OHIFSeries {
  SeriesInstanceUID: string;
  SeriesNumber: number;
  Modality: string;
  SeriesDescription: string;
  NumInstances: number;
  instances: OHIFInstance[];
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const seriesUid = searchParams.get("seriesUid");

    const { data, error } = await supabase.from("dicom").select("*").eq("id", id).single();
    const study = data as unknown as DicomTableRow | null;

    if (error || !study) return NextResponse.json({ error: "Study not found" }, { status: 404 });

    const allInstances: DicomInstance[] = study.instances || [];
    const seriesMap = new Map<string, OHIFSeries>();
    const orientationCache = new Map<string, number[]>();

    for (const inst of allInstances) {
      const sUID = inst.series_instance_uid;

      if (!seriesMap.has(sUID)) {
        const rawOri = inst.image_orientation || [1, 0, 0, 0, 1, 0];
        orientationCache.set(
          sUID,
          rawOri.map((v) => Number(v.toFixed(6))),
        );

        seriesMap.set(sUID, {
          SeriesInstanceUID: sUID,
          SeriesNumber: inst.series_number || 1,
          Modality: study.modality || "OT",
          SeriesDescription: inst.series_description?.trim() || `Serie ${inst.series_number}`,
          NumInstances: 0,
          instances: [],
        });
      }

      const s = seriesMap.get(sUID)!;
      s.NumInstances++;

      if (!seriesUid || sUID === seriesUid) {
        // ✅ Normalize window — fixes ADC black image bug for all ADC variants
        const { windowCenter, windowWidth, rescaleSlope, rescaleIntercept } = normalizeWindow(
          typeof inst.window_center === "number" ? inst.window_center : undefined,
          typeof inst.window_width === "number" ? inst.window_width : undefined,
          typeof inst.rescale_slope === "number" ? inst.rescale_slope : undefined,
          typeof inst.rescale_intercept === "number" ? inst.rescale_intercept : undefined,
        );

        s.instances.push({
          metadata: {
            SOPInstanceUID: inst.sop_instance_uid,
            InstanceNumber: inst.instance_number,
            SOPClassUID: inst.sop_class_uid,
            Rows: inst.rows,
            Columns: inst.columns,
            SamplesPerPixel: inst.samples_per_pixel ?? 1,
            PhotometricInterpretation: inst.photometric_interpretation ?? "MONOCHROME2",
            BitsAllocated: inst.bits_allocated,
            BitsStored: inst.bits_stored,
            HighBit: inst.high_bit,
            PixelRepresentation: inst.pixel_representation,
            PixelSpacing: inst.pixel_spacing
              ? inst.pixel_spacing.map((v) => Number(v.toFixed(6)))
              : [1, 1],
            ImageOrientationPatient: orientationCache.get(sUID)!,
            ImagePositionPatient: inst.image_position
              ? inst.image_position.map((v) => Number(v.toFixed(4)))
              : [0, 0, inst.instance_number],
            SliceThickness: inst.slice_thickness || 1,
            SpacingBetweenSlices: inst.slice_thickness || 1,
            ...(typeof windowCenter === "number" && { WindowCenter: windowCenter }),
            ...(typeof windowWidth === "number" && { WindowWidth: windowWidth }),
            ...(typeof rescaleIntercept === "number" && { RescaleIntercept: rescaleIntercept }),
            ...(typeof rescaleSlope === "number" && { RescaleSlope: rescaleSlope }),
            ...(inst.rescale_type && { RescaleType: inst.rescale_type }),
            ...(inst.number_of_frames &&
              inst.number_of_frames > 1 && { NumberOfFrames: inst.number_of_frames }),
          },
          url: `dicomweb:${inst.storage_url}`,
        });
      }
    }

    // --- GEOMETRIC NORMALIZATION ---
    seriesMap.forEach((series, sUID) => {
      const isMultiFrame =
        allInstances.find((i) => i.series_instance_uid === sUID)?.number_of_frames ?? 1;
      if (series.instances.length > 1 && isMultiFrame <= 1) {
        series.instances.sort(
          (a, b) => a.metadata.ImagePositionPatient[2] - b.metadata.ImagePositionPatient[2],
        );

        const z0 = series.instances[0].metadata.ImagePositionPatient[2];
        const zLast =
          series.instances[series.instances.length - 1].metadata.ImagePositionPatient[2];

        const totalDistance = Math.abs(zLast - z0);
        const averageSpacing = Number((totalDistance / (series.instances.length - 1)).toFixed(4));
        const direction = zLast > z0 ? 1 : -1;

        series.instances.forEach((inst, index) => {
          inst.metadata.InstanceNumber = index + 1;
          const forcedZ = Number((z0 + index * averageSpacing * direction).toFixed(4));
          inst.metadata.ImagePositionPatient[2] = forcedZ;
          inst.metadata.SliceThickness = averageSpacing;
          inst.metadata.SpacingBetweenSlices = averageSpacing;
        });
      }
    });

    return NextResponse.json(
      {
        studies: [
          {
            StudyInstanceUID: study.study_instance_uid,
            PatientName: study.patient_name || "Unknown",
            PatientID: study.patient_id || "Unknown",
            StudyDate: study.study_date ? study.study_date.replace(/-/g, "") : "20260225",
            StudyTime: "120000",
            StudyDescription: study.study_description || "",
            AccessionNumber: "",
            NumInstances: allInstances.length,
            series: Array.from(seriesMap.values()),
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cross-Origin-Resource-Policy": "cross-origin",
          "Cross-Origin-Embedder-Policy": "require-corp",
        },
      },
    );
  } catch (err) {
    console.error("Route Error:", err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
