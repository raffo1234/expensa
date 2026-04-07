/**
 * /api/hospitals/route.ts
 * GET  — list all hospitals
 * POST — create a new hospital + provision R2 bucket
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { S3Client, CreateBucketCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

// AE title must be 1-16 uppercase alphanumeric chars or hyphens — DICOM standard
const AE_TITLE_REGEX = /^[A-Z0-9\-]{1,16}$/;

// R2 bucket names: 3-63 chars, lowercase alphanumeric and hyphens
const BUCKET_NAME_REGEX = /^[a-z0-9][a-z0-9\-]{1,61}[a-z0-9]$/;

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("hospital")
      .select("id, name, is_active, r2_bucket, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/hospitals]", err);
    return NextResponse.json({ error: "Failed to fetch hospitals" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, ae_title, r2_bucket } = body;

    // --- Validation ---
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    if (!ae_title || !AE_TITLE_REGEX.test(ae_title)) {
      return NextResponse.json(
        {
          error:
            "ae_title must be 1-16 uppercase alphanumeric characters or hyphens (DICOM standard)",
        },
        { status: 400 },
      );
    }

    if (!r2_bucket || !BUCKET_NAME_REGEX.test(r2_bucket)) {
      return NextResponse.json(
        {
          error: "r2_bucket must be 3-63 lowercase alphanumeric characters or hyphens",
        },
        { status: 400 },
      );
    }

    // --- Check AE title uniqueness ---
    const { data: existing } = await supabase
      .from("hospital")
      .select("id")
      .eq("ae_title", ae_title)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "AE title already exists" }, { status: 409 });
    }

    // --- Provision R2 bucket ---
    try {
      await r2.send(new CreateBucketCommand({ Bucket: r2_bucket }));

      // Set CORS so the viewer can fetch directly from R2
      await r2.send(
        new PutBucketCorsCommand({
          Bucket: r2_bucket,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedOrigins: ["https://cadia.pe", "https://www.cadia.pe"],
                AllowedMethods: ["GET", "HEAD"],
                AllowedHeaders: ["*"],
                MaxAgeSeconds: 3600,
              },
            ],
          },
        }),
      );
    } catch (r2Err: unknown) {
      // BucketAlreadyExists is acceptable — bucket may have been pre-created
      const code = (r2Err as { Code?: string })?.Code;
      if (code !== "BucketAlreadyExists" && code !== "BucketAlreadyOwnedByYou") {
        console.error("[POST /api/hospitals] R2 bucket creation failed:", r2Err);
        return NextResponse.json({ error: "Failed to provision R2 bucket" }, { status: 500 });
      }
    }

    // --- Insert hospital ---
    const { data, error } = await supabase
      .from("hospital")
      .insert({
        name: name.trim(),
        ae_title: ae_title.trim(),
        r2_bucket: r2_bucket.trim(),
        is_active: true,
      })
      .select("id, name, ae_title, is_active, r2_bucket, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("[POST /api/hospitals]", err);
    return NextResponse.json({ error: "Failed to create hospital" }, { status: 500 });
  }
}
