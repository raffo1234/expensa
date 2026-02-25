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

    // 1. Fetch de Supabase
    const { data, error } = await supabase.from("dicom").select("*").eq("id", id).single();

    const study = data as unknown as DicomTableRow | null;

    if (error || !study) {
      return NextResponse.json({ error: "Study not found" }, { status: 404 });
    }

    const allInstances: DicomInstance[] = study.instances || [];
    const seriesMap = new Map<string, OHIFSeries>();

    // 2. Procesamiento Unificado (Crucial para evitar el error e[0])
    for (const inst of allInstances) {
      const sUID = inst.series_instance_uid;

      if (!seriesMap.has(sUID)) {
        seriesMap.set(sUID, {
          SeriesInstanceUID: sUID,
          SeriesNumber: inst.series_number || 1,
          Modality: study.modality || "OT",
          SeriesDescription: inst.series_description?.trim() || `Serie ${inst.series_number}`,
          NumInstances: 0,
          instances: [], // Se llena selectivamente abajo
        });
      }

      const s = seriesMap.get(sUID)!;
      s.NumInstances++;

      // Solo inyectamos metadatos de instancias si:
      // a) Es el modo inicial (no hay seriesUid)
      // b) Esta es la serie específica que el visor está pidiendo (Lazy Load)
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
            PixelSpacing: inst.pixel_spacing ? [...inst.pixel_spacing] : [1, 1],
            ImageOrientationPatient: inst.image_orientation
              ? [...inst.image_orientation]
              : [1, 0, 0, 0, 1, 0],
            ImagePositionPatient: inst.image_position
              ? [...inst.image_position]
              : [0, 0, inst.instance_number],
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

    // 3. Respuesta con cabeceras de seguridad COEP/COOP
    // Esto soluciona el error ERR_BLOCKED_BY_RESPONSE
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
