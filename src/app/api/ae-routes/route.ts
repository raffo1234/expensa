import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await supabase
    .from("ae_route")
    .select("*, hospital(id, name, ae_title)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
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
    .insert({ hospital_id, ae_title, host, port, description: description || null, is_active: is_active ?? true })
    .select("*, hospital(id, name, ae_title)")
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
