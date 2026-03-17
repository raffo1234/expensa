import { supabase } from "@/lib/supabase";
import { DicomTableRow } from "@/types/Dicom";
import { NextResponse } from "next/server";
import { DicomInstance } from "../../../../../workers/process-dicom/src/dicomWorkerUtils";

// --- WINDOW NORMALIZATION ---
// Fixes ADC series (eADC, ADC mm²/s, ADC m²/s) that store WindowCenter
// in physical units instead of pixel space — causing black images in OHIF.
//
// Detection: |WindowCenter| < 1 AND RescaleSlope is defined and not 0 or 1
// Conversion: pixel = (physical - RescaleIntercept) / RescaleSlope
const normalizeWindow = (
  windowCenter: number | undefined,
  windowWidth: number | undefined,
  rescaleSlope: number | undefined,
  rescaleIntercept: number | undefined,
): { windowCenter: number | undefined; windowWidth: number | undefined } => {
  if (windowCenter === undefined || windowWidth === undefined) {
    return { windowCenter, windowWidth };
  }

  // Already in pixel space
  if (Math.abs(windowCenter) >= 1) {
    return { windowCenter, windowWidth };
  }

  const slope = rescaleSlope ?? 1;
  const intercept = rescaleIntercept ?? 0;

  // Can't convert without a meaningful slope
  if (slope === 0 || slope === 1) {
    return { windowCenter, windowWidth };
  }

  return {
    windowCenter: Math.round((windowCenter - intercept) / slope),
    windowWidth: Math.round(windowWidth / slope),
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
        // ✅ Normalize window values — fixes ADC black image bug
        const { windowCenter, windowWidth } = normalizeWindow(
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
            // ✅ Use normalized values
            ...(typeof windowCenter === "number" && { WindowCenter: windowCenter }),
            ...(typeof windowWidth === "number" && { WindowWidth: windowWidth }),
            ...(typeof inst.rescale_intercept === "number" && {
              RescaleIntercept: inst.rescale_intercept,
            }),
            ...(typeof inst.rescale_slope === "number" && { RescaleSlope: inst.rescale_slope }),
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
