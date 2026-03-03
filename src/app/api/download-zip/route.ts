import { NextResponse } from "next/server";
import archiver from "archiver";
import { Readable } from "stream";
import { supabase } from "@/lib/supabase";
import pLimit from "p-limit";

const limit = pLimit(10);

export async function POST(req: Request) {
  try {
    const { fileIds } = await req.json();

    if (!fileIds?.length) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    const archive = archiver("zip", { zlib: { level: 1 } });

    const stream = Readable.toWeb(archive);

    (async () => {
      try {
        const { data: studies, error: dbError } = await supabase
          .from("dicom")
          .select("id, instances, patient_name")
          .in("id", fileIds);

        if (dbError || !studies) throw dbError;

        const allInstances = studies.flatMap((study) =>
          (study.instances || []).map((instance: any) => ({
            url: instance.storage_url,
            patientName: study.patient_name || study.id,
            sopUid: instance.sop_instance_uid,
          })),
        );

        await Promise.all(
          allInstances.map((item) =>
            limit(async () => {
              if (!item.url) return;

              try {
                const response = await fetch(item.url);

                if (!response.ok) {
                  console.error(`Error downloading ${item.url}: ${response.statusText}`);
                  return;
                }

                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                const fileName = `${item.patientName.replace(/[/\\?%*:|"<>]/g, "-")}/${item.sopUid}.dcm`;

                archive.append(buffer, { name: fileName });
              } catch (fetchError) {
                console.error(`Fetch failed for ${item.url}`, fetchError);
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

    return new Response(stream as any, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="DICOM_Cloud_${Date.now()}.zip"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Outer Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
