/**
 * POST /api/pull/find
 * Calls the SCP HTTP API to execute a C-FIND against an external PACS
 * Body: { host, port, aeTitle, filters }
 */

import { NextRequest, NextResponse } from "next/server";

const SCP_HTTP_URL = process.env.SCP_HTTP_URL ?? "http://localhost:3001";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { host, port, aeTitle, filters = {} } = body;

    if (!host || !port || !aeTitle) {
      return NextResponse.json({ error: "host, port and aeTitle are required" }, { status: 400 });
    }

    const res = await fetch(`${SCP_HTTP_URL}/find`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host, port, aeTitle, filters }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error ?? "C-FIND failed" }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch {
    console.error("[POST /api/pull/find]");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
