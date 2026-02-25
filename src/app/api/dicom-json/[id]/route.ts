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
    ImagePositionPatient: [number, number, number];
    ImageOrientationPatient: [number, number, number, number, number, number];
    PixelSpacing: [number, number];
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

  if (error || !data) {
    throw new Error(error?.message || "Study not found in database");
  }

  return {
    study_uid: data.study_instance_uid || `1.2.826.0.1.368.498.${data.id}`,
    patient_name: data.patient_name || "Paciente Desconocido",
    patient_id: data.patient_id || "unknown",
    description: data.study_description || "Estudio DICOM",
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
      {
        instances: OHIFInstance[];
        number: number;
        description: string;
      }
    > = {};

    studyData.instances.forEach((inst) => {
      const sUID = inst.series_instance_uid;

      // Inicializar el grupo de serie si no existe
      if (!seriesGroups[sUID]) {
        const sNum = inst.series_number || 1;
        const sDesc =
          inst.series_description && inst.series_description.trim() !== ""
            ? inst.series_description
            : `${studyData.modality} Serie ${sNum}`;

        seriesGroups[sUID] = {
          instances: [],
          number: sNum,
          description: sDesc,
        };
      }

      // Agregar la instancia al grupo correspondiente
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
          ImagePositionPatient: [0, 0, inst.instance_number],
          ImageOrientationPatient: [1, 0, 0, 0, 1, 0],
          PixelSpacing: [1, 1],
        },
        url: `dicomweb:${inst.storage_url}`,
      });
    });

    const dicomJson = {
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
    };

    return NextResponse.json(dicomJson, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
  });
}
