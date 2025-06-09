import { Client, requests, constants } from "dcmjs-dimse";
import type { EventEmitter } from "events";

function extractValue(dataset: any, tag: string): string {
  const field = dataset[tag];
  if (!field || !Array.isArray(field.Value) || field.Value.length === 0)
    return "(empty)";
  // Value array can contain strings or objects (sometimes PersonName)
  if (typeof field.Value[0] === "string") return field.Value[0];
  // Handle PersonName (PN) type objects
  if (typeof field.Value[0] === "object" && field.Value[0].Alphabetic)
    return field.Value[0].Alphabetic;
  return "(unknown)";
}

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  const body = await req.json();
  const {
    ip,
    port,
    aet,
    clientAet = "MY_CLIENT_AE",
    startDate,
    endDate,
    modality,
  } = body;

  if (!ip || !port || !aet || !startDate || !endDate) {
    return Response.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  const format = (d: string) => d.replace(/-/g, "");
  const query = {
    QueryRetrieveLevel: "STUDY",
    StudyDate: `${format(startDate)}-${format(endDate)}`,
    ...(modality && { ModalitiesInStudy: modality }),
  };

  const results: any[] = [];
  const client = new Client();
  const request = requests.CFindRequest.createStudyFindRequest(query);
  const emitter = request as unknown as EventEmitter;

  const resultsPromise = new Promise<any[]>((resolve, reject) => {
    emitter.on("response", (res) => {
      const status = res.getStatus();

      if (status === constants.Status.Pending && res.hasDataset()) {
        const dataset = res.getDataset().elements;
        console.log("📦 Dataset received:", dataset);

        results.push({
          patientName: dataset.PatientName.Alphabetic,
          studyDate: dataset.StudyDate,
          studyDescription: dataset.StudyDescription,
          modalitiesInStudy: dataset.ModalitiesInStudy,
        });
      }

      if (status === constants.Status.Success) {
        console.log("✅ C-FIND Success — resolving results");
        resolve(results);
      }
    });

    emitter.on("error", (err) => {
      console.error("❌ C-FIND error:", err);
      reject(err);
    });
  });

  client.addRequest(request);
  await client.send(ip, port, clientAet, aet);
  const studies = await resultsPromise;

  return Response.json({ ok: true, studies });
}
