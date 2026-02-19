import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { PostgrestError } from "@supabase/supabase-js";

// 1. Tipados Estrictos (Clean & No Any)
interface DicomInstance {
  storage_url: string;
  instance_number: number;
  sop_instance_uid: string;
  series_instance_uid: string;
}

interface DicomTable {
  id: string;
  created_at: string;
  study_instance_uid: string | null;
  instances: DicomInstance[] | null;
  patient_id: string | null;
  patient_name: string | null;
  study_description: string | null;
}

interface SeriesInstance {
  metadata: {
    SOPInstanceUID: string;
    InstanceNumber: number;
    SOPClassUID: string;
    Rows: number;
    Columns: number;
    SamplesPerPixel: number;
    PhotometricInterpretation: string;
    BitsAllocated: number;
  };
  url: string;
}

interface SeriesGroup {
  [key: string]: SeriesInstance[];
}

// 2. Función para obtener datos de Supabase
async function getStudyData(studyId: string) {
  const { data, error }: { data: DicomTable | null; error: PostgrestError | null } = await supabase
    .from("dicom")
    .select(
      `
      id,
      created_at,
      study_instance_uid,
      instances, 
      patient_id,
      patient_name,
      study_description
    `,
    )
    .eq("id", studyId)
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
  };
}

// 3. Método GET
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const studyData = await getStudyData(id);

    const seriesMap: SeriesGroup = {};

    studyData.instances.forEach((inst: DicomInstance) => {
      const sUID = inst.series_instance_uid || "1.2.3.4.default";
      if (!seriesMap[sUID]) seriesMap[sUID] = [];

      seriesMap[sUID].push({
        metadata: {
          SOPInstanceUID: inst.sop_instance_uid,
          InstanceNumber: inst.instance_number,
          SOPClassUID: "1.2.840.10008.5.1.4.1.1.2", // CT Image Storage
          Rows: 512,
          Columns: 512,
          SamplesPerPixel: 1,
          PhotometricInterpretation: "MONOCHROME2",
          BitsAllocated: 16,
        },
        url: inst.storage_url,
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
            : "20260101",
          StudyTime: "120000",
          StudyDescription: studyData.description,
          NumInstances: studyData.instances.length,
          series: Object.entries(seriesMap).map(([sUID, instances], index) => ({
            SeriesInstanceUID: sUID,
            SeriesNumber: index + 1,
            Modality: "CT",
            SeriesDescription: `Serie ${index + 1}`,
            instances: instances,
          })),
        },
      ],
    };

    // --- RESPUESTA CON HEADERS DE COMPATIBILIDAD OHIF v3 ---
    return NextResponse.json(dicomJson, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Range",
        "Access-Control-Expose-Headers": "Content-Length, Content-Range",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "Cross-Origin-Embedder-Policy": "credentialless",
      },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: errorMessage },
      {
        status: 404,
        headers: { "Access-Control-Allow-Origin": "*" },
      },
    );
  }
}

// 4. Método OPTIONS (Crucial para corregir el 'Failed to fetch')
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Range",
      "Access-Control-Max-Age": "86400",
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
  });
}
