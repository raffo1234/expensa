/**
 * /api/hospitals/[id]/route.ts
 * GET   — fetch single hospital
 * PATCH — update name or is_active (ae_title and r2_bucket are immutable)
 * DELETE — soft delete via is_active = false (never hard delete in production)
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from("hospital")
      .select("id, name, ae_title, is_active, r2_bucket, created_at, updated_at")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/hospitals/[id]]", err);
    return NextResponse.json({ error: "Failed to fetch hospital" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    // ae_title and r2_bucket are immutable after creation
    // changing ae_title would break existing modaliy configurations at hospitals
    const { name, is_active } = body;

    const updates: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json({ error: "name must be a non-empty string" }, { status: 400 });
      }
      updates.name = name.trim();
    }

    if (is_active !== undefined) {
      if (typeof is_active !== "boolean") {
        return NextResponse.json({ error: "is_active must be a boolean" }, { status: 400 });
      }
      updates.is_active = is_active;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("hospital")
      .update(updates)
      .eq("id", id)
      .select("id, name, ae_title, is_active, r2_bucket, created_at, updated_at")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[PATCH /api/hospitals/[id]]", err);
    return NextResponse.json({ error: "Failed to update hospital" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Check if hospital has studies before deactivating
    const { count } = await supabase
      .from("dicom_study")
      .select("id", { count: "exact", head: true })
      .eq("hospital_id", id);

    // Soft delete only — never hard delete a hospital that has studies
    // Hard delete is blocked by the ON DELETE RESTRICT foreign key anyway
    const { data, error } = await supabase
      .from("hospital")
      .update({ is_active: false })
      .eq("id", id)
      .select("id, name, ae_title, is_active")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Hospital not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...data,
      studies_count: count ?? 0,
      message: "Hospital deactivated. AE title will be rejected by SCP immediately.",
    });
  } catch (err) {
    console.error("[DELETE /api/hospitals/[id]]", err);
    return NextResponse.json({ error: "Failed to deactivate hospital" }, { status: 500 });
  }
}
