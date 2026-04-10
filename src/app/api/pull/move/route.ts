import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const SCP_HTTP_URL = process.env.SCP_HTTP_URL ?? "http://localhost:3001";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { aeTitle, studyInstanceUID, hospitalId } = body;

    if (!aeTitle || !studyInstanceUID || !hospitalId) {
      return NextResponse.json(
        { error: "aeTitle, studyInstanceUID and hospitalId are required" },
        { status: 400 },
      );
    }

    // Validar que la ruta exista en ae_route — ignoramos host/port del body
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

    // Usamos host/port de la DB, no del body
    const res = await fetch(`${SCP_HTTP_URL}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: route.host, // ← de la DB
        port: route.port, // ← de la DB
        aeTitle: route.ae_title,
        studyInstanceUID,
        hospitalId,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error ?? "C-MOVE failed" }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[POST /api/pull/move]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
