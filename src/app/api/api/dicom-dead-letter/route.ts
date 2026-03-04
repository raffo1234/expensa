/**
 * /api/dicom-dead-letter/route.ts
 * Called by the Service Worker when an upload permanently fails.
 * Logs the entry to Supabase for manual review and recovery.
 *
 * POST /api/dicom-dead-letter
 * Body: { user_id, storage_path, study_instance_uid, error_message, attempts }
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  let body: {
    user_id?: string;
    storage_path?: string;
    study_instance_uid?: string;
    error_message?: string;
    attempts?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { user_id, storage_path, study_instance_uid, error_message, attempts } = body;

  if (!user_id || !storage_path || !study_instance_uid) {
    return NextResponse.json(
      { error: "Missing required fields: user_id, storage_path, study_instance_uid" },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("dicom_upload_failures").insert({
    user_id,
    storage_path,
    study_instance_uid,
    error_message: error_message ?? "Unknown error",
    attempts: attempts ?? 0,
    failed_at: new Date().toISOString(),
    resolved: false,
  });

  if (error) {
    console.error("[dicom-dead-letter] Supabase insert error:", error);
    return NextResponse.json({ error: "Failed to log dead letter entry" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
