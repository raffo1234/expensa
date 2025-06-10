import { Client, requests, constants } from "dcmjs-dimse";
import type { EventEmitter } from "events";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  const { CEchoRequest } = requests;
  const body = await req.json();
  const { ip, port, aet, clientAet = "MY_CLIENT_AE" } = body;

  if (!ip || !port || !aet) {
    return Response.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  const client = new Client();
  const request = new CEchoRequest();
  const emitter = request as unknown as EventEmitter;

  const resultsPromise = new Promise<boolean>((resolve, reject) => {
    emitter.on("response", (res) => {
      const status = res.getStatus();

      if (status === constants.Status.Success) {
        console.log("Happy!");
        resolve(true);
      }
    });

    emitter.on("error", (err) => {
      console.error("❌ C-FIND error:", err);
      reject(err);
      resolve(false);
    });
  });

  client.addRequest(request);

  //   client.on("networkError", (e) => {
  //     console.log("Network error: ", e);
  //   });

  try {
    await client.send(ip, port, clientAet, aet);
    const status = await resultsPromise;

    return Response.json({ ok: true, status });
  } catch (error) {
    console.error("C-ECHO failed:", error);
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "C-ECHO failed",
    });
  }
}
