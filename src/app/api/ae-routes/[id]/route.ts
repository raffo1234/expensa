import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const { ae_title, host, port, description, is_active } = body;

  const { data, error } = await supabase
    .from("ae_route")
    .update({ ae_title, host, port, description: description || null, is_active })
    .eq("id", id)
    .select("*, hospital(id, name, ae_title)")
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { error } = await supabase.from("ae_route").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "Deleted successfully" });
}
