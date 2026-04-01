import { NextResponse } from "next/server";
import archiver from "archiver";
import { supabase } from "@/lib/supabase";
import pLimit from "p-limit";

interface DicomInstance {
  storage_url: string;
  sop_instance_uid: string;
}

const fetchLimit = pLimit(10);

export async function POST(req: Request) {
  try {
    const { fileIds, zipName } = (await req.json()) as {
      fileIds: string[];
      zipName: string;
    };

    if (!fileIds?.length) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    const folderName = zipName || `studies_${new Date().toISOString().split("T")[0]}`;

    const { data: studies, error: dbError } = await supabase
      .from("dicom")
      .select("id, instances")
      .in("id", fileIds);

    if (dbError || !studies) {
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    const allInstances = studies.flatMap((study) =>
      ((study.instances as DicomInstance[]) || []).map((instance) => ({
        url: instance.storage_url,
        folderName,
        sopUid: instance.sop_instance_uid,
      })),
    );

    // 1. Fetch all buffers concurrently
    const fetched = await Promise.all(
      allInstances.map((item) =>
        fetchLimit(async () => {
          if (!item.url) return null;
          try {
            const response = await fetch(item.url);
            if (!response.ok) return null;
            return {
              buffer: Buffer.from(await response.arrayBuffer()),
              fileName: `${item.folderName}/${item.sopUid}.dcm`,
            };
          } catch (err) {
            console.error(`Fetch error for ${item.url}:`, err);
            return null;
          }
        }),
      ),
    );

    // 2. Collect zip into a Buffer — avoids Node→Web stream conversion issues
    const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
      const archive = archiver("zip", { store: true });
      const chunks: Buffer[] = [];

      archive.on("data", (chunk) => chunks.push(chunk));
      archive.on("end", () => resolve(Buffer.concat(chunks)));
      archive.on("error", reject);

      for (const item of fetched) {
        if (!item) continue;
        archive.append(item.buffer, { name: item.fileName });
      }

      archive.finalize();
    });

    return new Response(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${folderName}.zip"`,
      },
    });
  } catch (error) {
    console.error("Download zip error:", error);
    return NextResponse.json({ error: `Internal Server Error: ${error}` }, { status: 500 });
  }
}
