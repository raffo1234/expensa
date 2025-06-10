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

  const TIMEOUT = 10000; // 10s timeout

  const statusPromise = new Promise<boolean>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("C-ECHO timeout after 15s"));
    }, TIMEOUT);

    emitter.on("response", (res) => {
      clearTimeout(timer);
      const status = res.getStatus();
      resolve(status === constants.Status.Success);
    });

    emitter.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  client.addRequest(request);

  try {
    await client.send(ip, port, clientAet, aet);
    const status = await statusPromise;

    return Response.json({ ok: true, status });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "C-ECHO failed",
    });
  }
}
