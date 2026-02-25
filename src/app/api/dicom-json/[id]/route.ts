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

    // Usamos el genérico en .from para un tipado real desde el inicio
    const { data, error } = await supabase.from("dicom").select("*").eq("id", id).single();

    // Casting seguro
    const study = data as unknown as DicomTableRow | null;

    if (error || !study) {
      return NextResponse.json({ error: "Study not found" }, { status: 404 });
    }

    const allInstances: DicomInstance[] = study.instances || [];

    // --- MODO LAZY: Metadatos de una Serie ---
    if (seriesUid) {
      const filtered = allInstances.filter((i) => i.series_instance_uid === seriesUid);

      const instances: OHIFInstance[] = filtered.map((inst) => {
        // Aseguramos que los arrays existan para cumplir con el tipo OHIFInstance
        const pixelSpacing = inst.pixel_spacing ? [...inst.pixel_spacing] : [1, 1];
        const imageOrientation = inst.image_orientation
          ? [...inst.image_orientation]
          : [1, 0, 0, 0, 1, 0];
        const imagePosition = inst.image_position
          ? [...inst.image_position]
          : [0, 0, inst.instance_number];

        return {
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
            PixelSpacing: pixelSpacing,
            ImageOrientationPatient: imageOrientation,
            ImagePositionPatient: imagePosition,
            ...(typeof inst.window_center === "number" && { WindowCenter: inst.window_center }),
            ...(typeof inst.window_width === "number" && { WindowWidth: inst.window_width }),
            ...(typeof inst.rescale_intercept === "number" && {
              RescaleIntercept: inst.rescale_intercept,
            }),
            ...(typeof inst.rescale_slope === "number" && { RescaleSlope: inst.rescale_slope }),
          },
          url: `dicomweb:${inst.storage_url}`,
        };
      });

      return NextResponse.json({ SeriesInstanceUID: seriesUid, instances });
    }

    // --- MODO RESUMEN: Carga Inicial ---
    const seriesMap = new Map<string, OHIFSeries>();

    for (const inst of allInstances) {
      const sUID = inst.series_instance_uid;
      let s = seriesMap.get(sUID);

      if (!s) {
        s = {
          SeriesInstanceUID: sUID,
          SeriesNumber: inst.series_number || 1,
          Modality: study.modality || "OT",
          SeriesDescription: inst.series_description?.trim() || `Serie ${inst.series_number}`,
          NumInstances: 0,
          instances: [],
        };
        seriesMap.set(sUID, s);
      }
      s.NumInstances++;
    }

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
            series: Array.from(seriesMap.values()),
          },
        ],
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cross-Origin-Resource-Policy": "cross-origin",
          "Cross-Origin-Embedder-Policy": "require-corp",
        },
      },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
