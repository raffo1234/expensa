import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2, BUCKET } from "@/lib/r2";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  const storagePath = path.join("/");

  const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: storagePath }));

  const body = await res.Body?.transformToByteArray();
  if (!body) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(Buffer.from(body), {
    headers: {
      "Content-Type": res.ContentType ?? "application/octet-stream",
      "Cross-Origin-Resource-Policy": "cross-origin",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { path } = await params;
  const storagePath = path.join("/");

  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: storagePath }));

  return new NextResponse(null, { status: 204 });
}
