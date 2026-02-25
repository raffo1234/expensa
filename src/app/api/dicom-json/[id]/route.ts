import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

interface DicomInstance {
  storage_url: string;
  instance_number: number;
  sop_instance_uid: string;
  series_instance_uid: string;
  sop_class_uid: string;
  series_number: number;
  series_description: string;
  rows: number;
  columns: number;
  bits_allocated: number;
  bits_stored: number;
  high_bit: number;
  pixel_representation: number;
  pixel_spacing?: [number, number];
  image_orientation?: [number, number, number, number, number, number];
  image_position?: [number, number, number];
  window_center?: number;
  window_width?: number;
  rescale_intercept?: number;
  rescale_slope?: number;
}

interface DicomTable {
  id: string;
  created_at: string;
  study_instance_uid: string | null;
  instances: DicomInstance[] | null;
  patient_id: string | null;
  patient_name: string | null;
  study_description: string | null;
  modality: string | null;
}

// Interfaz para el JSON final que OHIF entiende
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

async function getStudyData(studyId: string) {
  const { data, error } = await supabase
    .from("dicom")
    .select(
      "id, created_at, study_instance_uid, instances, patient_id, patient_name, study_description, modality",
    )
    .eq("id", studyId)
    .returns<DicomTable[]>()
    .single();

  if (error || !data) throw new Error(error?.message || "Study not found");

  return {
    study_uid: data.study_instance_uid || `1.2.826.0.1.368.498.${data.id}`,
    patient_name: data.patient_name || "Unknown",
    patient_id: data.patient_id || "unknown",
    description: data.study_description || "Study",
    created_at: data.created_at,
    instances: data.instances || [],
    modality: data.modality || "OT",
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const studyData = await getStudyData(id);

    const seriesGroups: Record<
      string,
      { instances: OHIFInstance[]; number: number; description: string }
    > = {};

    studyData.instances.forEach((inst) => {
      const sUID = inst.series_instance_uid;

      if (!seriesGroups[sUID]) {
        seriesGroups[sUID] = {
          instances: [],
          number: inst.series_number || 1,
          description:
            inst.series_description?.trim() ||
            `${studyData.modality} Serie ${inst.series_number || 1}`,
        };
      }

      seriesGroups[sUID].instances.push({
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
          // Datos Geométricos con fallbacks numéricos
          PixelSpacing: inst.pixel_spacing || [1, 1],
          ImageOrientationPatient: inst.image_orientation || [1, 0, 0, 0, 1, 0],
          ImagePositionPatient: inst.image_position || [0, 0, inst.instance_number],
          // Datos de Ventana
          WindowCenter: inst.window_center,
          WindowWidth: inst.window_width,
          RescaleIntercept: inst.rescale_intercept,
          RescaleSlope: inst.rescale_slope,
        },
        url: `dicomweb:${inst.storage_url}`,
      });
    });

    return NextResponse.json(
      {
        studies: [
          {
            StudyInstanceUID: studyData.study_uid,
            PatientName: studyData.patient_name,
            PatientID: studyData.patient_id,
            StudyDate: studyData.created_at
              ? new Date(studyData.created_at).toISOString().split("T")[0].replace(/-/g, "")
              : "20260225",
            StudyTime: "120000",
            StudyDescription: studyData.description,
            NumInstances: studyData.instances.length,
            series: Object.entries(seriesGroups).map(([sUID, group]) => ({
              SeriesInstanceUID: sUID,
              SeriesNumber: group.number,
              Modality: studyData.modality,
              SeriesDescription: group.description,
              instances: group.instances,
            })),
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
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 404 });
  }
}
