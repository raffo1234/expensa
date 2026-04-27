/**
 * POST /api/pull/find
 * Calls the SCP HTTP API to execute a C-FIND against an external PACS
 * Body: { aeTitle, hospitalId, filters }
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const SCP_HTTP_URL = process.env.SCP_HTTP_URL ?? "http://localhost:3001";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { aeTitle, hospitalId, filters = {} } = body;

    if (!aeTitle || !hospitalId) {
      return NextResponse.json({ error: "aeTitle and hospitalId are required" }, { status: 400 });
    }

    // Sacamos host/port de la DB, no del body
    const { data: route, error } = await supabase
      .from("ae_route")
      .select("host, port, ae_title")
      .eq("hospital_id", hospitalId)
      .eq("ae_title", aeTitle)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !route) {
      return NextResponse.json({ error: "Route not found or inactive" }, { status: 404 });
    }

    const res = await fetch(`${SCP_HTTP_URL}/find`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: route.host,
        port: route.port,
        aeTitle: route.ae_title,
        filters,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error ?? "C-FIND failed" }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[POST /api/pull/find]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
