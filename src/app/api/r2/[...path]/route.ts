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

  return new NextResponse(Buffer.from(body), {
    headers: {
      "Content-Type": res.ContentType ?? "application/octet-stream",
      // Private: invoices must never be stored by a shared CDN cache, which
      // would serve them to anyone without checking access.
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
