import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET } from "@/lib/r2";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { AccessError, requireRowAccess, requireUser } from "@/lib/access";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

// Serves expense attachments. Only files registered as an attachment of an
// expense the caller can access are served; the path itself is never trusted.
// Deleting files goes through the deleteAttachment server action.
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  const storagePath = path.join("/");

  try {
    await requireUser();
    const { data: attachment, error } = await supabaseAdmin
      .from("expense_attachment")
      .select("expense_id")
      .eq("storage_path", storagePath)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!attachment) return new NextResponse("Not found", { status: 404 });
    await requireRowAccess("expense", attachment.expense_id);
  } catch (err) {
    if (err instanceof AccessError) return new NextResponse("Forbidden", { status: 403 });
    throw err;
  }

  const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: storagePath }));
  const body = await res.Body?.transformToByteArray();
  if (!body) return new NextResponse("Not found", { status: 404 });

  const contentType = res.ContentType ?? "application/octet-stream";
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    // Private: invoices must never be stored by a shared CDN cache, which
    // would serve them to anyone without checking access.
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  };
  // PDFs and images open inline (the browser PDF viewer can't run sandboxed).
  // Anything else is never rendered on our origin: it's downloaded, and
  // sandboxed in case a browser tries to display it anyway.
  if (contentType !== "application/pdf" && !contentType.startsWith("image/")) {
    headers["Content-Disposition"] = "attachment";
    headers["Content-Security-Policy"] = "sandbox; default-src 'none'";
  }
  if (contentType === "image/svg+xml") {
    headers["Content-Security-Policy"] = "sandbox; default-src 'none'; style-src 'unsafe-inline'";
  }

  return new NextResponse(Buffer.from(body), { headers });
}
