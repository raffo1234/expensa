import { DicomInstance, DicomTableRow } from "@/lib/processDicomStudyTurbo";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

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
        if (inst.image_orientation) {
          orientationCache.set(
            sUID,
            inst.image_orientation.map((v) => Number(v.toFixed(6))),
          );
        }
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
        // Normalización inicial de metadatos
        const orientation = orientationCache.get(sUID) || [1, 0, 0, 0, 1, 0];
        const position = inst.image_position
          ? inst.image_position.map((v) => Number(v.toFixed(4)))
          : [0, 0, inst.instance_number];

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
            ImageOrientationPatient: orientation,
            ImagePositionPatient: position,
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

    // --- BLOQUE DE NORMALIZACIÓN GEOMÉTRICA FORZADA ---
    seriesMap.forEach((series) => {
      if (series.instances.length > 1) {
        // 1. Ordenar físicamente por Z
        series.instances.sort(
          (a, b) => a.metadata.ImagePositionPatient[2] - b.metadata.ImagePositionPatient[2],
        );

        // 2. Calcular el espaciado real entre las primeras dos
        const z0 = series.instances[0].metadata.ImagePositionPatient[2];
        const z1 = series.instances[1].metadata.ImagePositionPatient[2];
        const step =
          Number(Math.abs(z1 - z0).toFixed(4)) || series.instances[0].metadata.SliceThickness || 1;

        // 3. Linealizar toda la serie
        series.instances.forEach((inst, index) => {
          // Fix: Missing Frames
          inst.metadata.InstanceNumber = index + 1;

          // Fix: Inconsistent Position / Irregular Spacing
          // Forzamos a que cada slice esté exactamente a 'step' de distancia del anterior
          const forcedZ = Number((z0 + index * (z1 > z0 ? step : -step)).toFixed(4));
          inst.metadata.ImagePositionPatient[2] = forcedZ;

          // Fix: Not a reconstructable 3D volume
          inst.metadata.SliceThickness = step;
          inst.metadata.SpacingBetweenSlices = step;
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
