import { Client, requests, constants } from "dcmjs-dimse";
import type { EventEmitter } from "events";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  const body = await req.json();
  const {
    ip,
    port,
    aet_server,
    aet_client = "MY_CLIENT_AE",
    startDate,
    endDate,
    modality,
  } = body;

  if (!ip || !port || !aet_server || !startDate || !endDate) {
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
          studyDate: dataset.StudyDate,
          studyTime: dataset.StudyTime,
          modalitiesInStudy: dataset.ModalitiesInStudy,
          studyDescription: dataset.StudyDescription,
          patientName: dataset.PatientName.Alphabetic,
          patientId: dataset.PatientID,
          patientBirthDate: dataset.PatientBirthDate,
          patientSex: dataset.PatientSex,
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
  await client.send(ip, port, aet_client, aet_server);
  const studies = await resultsPromise;

  return Response.json({ ok: true, studies });
}
