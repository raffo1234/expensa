/// <reference types="@cloudflare/workers-types" />

export { DicomProcessor } from "./DicomProcessor";

export interface Env {
  DICOM_BUCKET: R2Bucket;
  DICOM_PROCESSOR: DurableObjectNamespace;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  STORAGE_DOMAIN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const { storagePath, userId, jobId } = (await request.json()) as {
      storagePath: string;
      userId: string;
      jobId: string;
    };

    if (!storagePath || !userId || !jobId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create a Durable Object instance per job
    // jobId ensures each job gets its own isolated DO
    const id = env.DICOM_PROCESSOR.idFromName(jobId);
    const stub = env.DICOM_PROCESSOR.get(id);

    // Forward the request to the DO
    return stub.fetch(request.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storagePath, userId, jobId }),
    });
  },
};
