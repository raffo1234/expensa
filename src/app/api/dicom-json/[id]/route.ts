import { DicomInstance, DicomTableRow } from "@/lib/processDicomStudyTurbo";
import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// Interfaces para cumplir con el esquema de metadatos de OHIF v3
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

    // 1. Fetch de datos desde Supabase
    const { data, error } = await supabase.from("dicom").select("*").eq("id", id).single();

    const study = data as unknown as DicomTableRow | null;

    if (error || !study) {
      return NextResponse.json({ error: "Study not found" }, { status: 404 });
    }

    const allInstances: DicomInstance[] = study.instances || [];
    const seriesMap = new Map<string, OHIFSeries>();

    // Cache para asegurar que toda la serie tenga la misma orientación (Fix Warning #1)
    const orientationCache = new Map<string, number[]>();

    // 2. Procesamiento y Agrupación por Series
    for (const inst of allInstances) {
      const sUID = inst.series_instance_uid;

      if (!seriesMap.has(sUID)) {
        // Normalizamos la orientación de la primera instancia como referencia
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

      // Lazy Loading: Solo incluimos metadatos detallados si es la serie solicitada o carga inicial
      if (!seriesUid || sUID === seriesUid) {
        // Redondeo de posición para evitar errores por ruido decimal (Fix Warning #2)
        const position = inst.image_position
          ? inst.image_position.map((v) => Number(v.toFixed(4)))
          : [0, 0, inst.instance_number];

        const orientation = orientationCache.get(sUID) || [1, 0, 0, 0, 1, 0];
        const thickness = inst.slice_thickness || 1;

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
            SliceThickness: thickness,
            SpacingBetweenSlices: thickness, // Requerido para reconstrucción volumétrica
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

    // 3. Normalización Final de la Serie (Fix Warning #3 y #4)
    seriesMap.forEach((series) => {
      if (series.instances.length > 0) {
        // A. Ordenamiento físico por coordenada Z (Profundidad)
        series.instances.sort(
          (a, b) => a.metadata.ImagePositionPatient[2] - b.metadata.ImagePositionPatient[2],
        );

        // B. Re-indexación correlativa de InstanceNumber
        // Esto elimina el error "Missing Frames" al crear una secuencia sin huecos
        series.instances.forEach((inst, index) => {
          inst.metadata.InstanceNumber = index + 1;
        });
      }
    });

    // 4. Respuesta con Headers de Seguridad para SharedArrayBuffer (COEP/COOP)
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
