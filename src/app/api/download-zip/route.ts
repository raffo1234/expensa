import { NextResponse } from "next/server";
import archiver from "archiver";
import { Readable } from "stream";
import { supabase } from "@/lib/supabase";
import pLimit from "p-limit";

interface DicomInstance {
  storage_url: string;
  sop_instance_uid: string;
  instance_number?: number;
}

const limit = pLimit(10);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { fileIds: string[] };
    const { fileIds } = body;

    if (!fileIds?.length) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    const archive = archiver("zip", { zlib: { level: 1 } });
    const stream = Readable.toWeb(archive) as ReadableStream;

    (async () => {
      try {
        const { data: studies, error: dbError } = await supabase
          .from("dicom")
          .select("id, instances, patient_name")
          .in("id", fileIds);

        if (dbError || !studies) throw dbError;

        const allInstances = studies.flatMap((study) => {
          const folderName = (study.patient_name || study.id).replace(/[/\\?%*:|"<>]/g, "-");

          const instances = (study.instances as DicomInstance[]) || [];

          return instances.map((instance: DicomInstance) => ({
            url: instance.storage_url,
            folderName: folderName,
            sopUid: instance.sop_instance_uid,
          }));
        });

        await Promise.all(
          allInstances.map((item) =>
            limit(async () => {
              if (!item.url) return;

              try {
                const response = await fetch(item.url);
                if (!response.ok) return;

                const arrayBuffer = await response.arrayBuffer();
                const fileName = `${item.folderName}/${item.sopUid}.dcm`;

                archive.append(Buffer.from(arrayBuffer), { name: fileName });
              } catch (fetchError) {
                console.error(`Fetch error for ${item.url}:`, fetchError);
              }
            }),
          ),
        );
      } catch (err) {
        console.error("Critical Zip Error:", err);
      } finally {
        archive.finalize();
      }
    })();

    return new Response(stream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="DICOM_Cloud_${Date.now()}.zip"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: `Internal Server Error ${error}` }, { status: 500 });
  }
}
