import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const hospitalId = searchParams.get("hospitalId");

  let query = supabase.from("ae_route").select("*, hospital:hospital_id(id, name)");

  if (hospitalId) {
    query = query.eq("hospital_id", hospitalId);
  }

  const { data, error } = await query;
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { hospital_id, ae_title, host, port, description, is_active } = body;

  if (!hospital_id || !ae_title || !host || !port) {
    return NextResponse.json(
      { message: "Missing required fields: hospital_id, ae_title, host, port" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("ae_route")
    .insert({
      hospital_id,
      ae_title,
      host,
      port,
      description: description || null,
      is_active: is_active ?? true,
    })
    .select("*, hospital:hospital_id(id, name)")
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
