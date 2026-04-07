import { NextRequest, NextResponse } from "next/server";

const SCP_HTTP_URL = process.env.SCP_HTTP_URL ?? "http://localhost:3001";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { host, port, aeTitle, studyInstanceUID, hospitalId } = body;

    if (!host || !port || !aeTitle || !studyInstanceUID || !hospitalId) {
      return NextResponse.json(
        { error: "host, port, aeTitle, studyInstanceUID and hospitalId are required" },
        { status: 400 },
      );
    }

    const res = await fetch(`${SCP_HTTP_URL}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host,
        port,
        aeTitle,
        studyInstanceUID,
        hospitalId,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error ?? "C-MOVE failed" }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch {
    console.error("[POST /api/pull/move]");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
