import { DicomInstance } from "@/lib/processDicomStudyTurbo";
import { supabase } from "@/lib/supabase";
import { DicomTableRow } from "@/types/Dicom";
import { NextResponse } from "next/server";

// Interfaces estrictas para el Schema de OHIF/Cornerstone
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
        // Normalización estricta de Orientación (Warning #1 fix)
        // Forzamos 6 decimales para que todos los vectores sean IDÉNTICOS
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
        s.instances.push({
          metadata: {
            SOPInstanceUID: inst.sop_instance_uid,
            InstanceNumber: inst.instance_number,
            SOPClassUID: inst.sop_class_uid,
            Rows: inst.rows,
            Columns: inst.columns,
            SamplesPerPixel: 1,
            PhotometricInterpretation: "MONOCHROME2",
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
            ...(typeof inst.window_center === "number" && { WindowCenter: inst.window_center }),
            ...(typeof inst.window_width === "number" && { WindowWidth: inst.window_width }),
            ...(typeof inst.rescale_intercept === "number" && {
              RescaleIntercept: inst.rescale_intercept,
            }),
            ...(typeof inst.rescale_slope === "number" && { RescaleSlope: inst.rescale_slope }),
          },
          url: `dicomweb:${inst.storage_url}`,
        });
      }
    }

    // --- NORMALIZACIÓN GEOMÉTRICA RADICAL ---
    seriesMap.forEach((series) => {
      if (series.instances.length > 1) {
        // 1. Ordenar físicamente por Z
        series.instances.sort(
          (a, b) => a.metadata.ImagePositionPatient[2] - b.metadata.ImagePositionPatient[2],
        );

        // 2. Determinar la dirección del stack (ascendente o descendente)
        const z0 = series.instances[0].metadata.ImagePositionPatient[2];
        const zLast =
          series.instances[series.instances.length - 1].metadata.ImagePositionPatient[2];

        // Calcular el espaciado PROMEDIO para ignorar irregularidades locales (Fix Warning #2 y #3)
        const totalDistance = Math.abs(zLast - z0);
        const averageSpacing = Number((totalDistance / (series.instances.length - 1)).toFixed(4));
        const direction = zLast > z0 ? 1 : -1;

        // 3. Forzar alineación perfecta
        series.instances.forEach((inst, index) => {
          // Fix Warning #4 (InstanceNumber correlativo)
          inst.metadata.InstanceNumber = index + 1;

          // Re-posicionamiento matemático exacto
          const forcedZ = Number((z0 + index * averageSpacing * direction).toFixed(4));
          inst.metadata.ImagePositionPatient[2] = forcedZ;

          // Forzamos el espaciado para que el visor no detecte "gaps"
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
