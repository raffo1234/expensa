import { NextRequest, NextResponse } from "next/server";

const R2_BASE = process.env.NEXT_PUBLIC_PUBLIC_DEVELOPMENT_URL!;

export async function GET(_req: NextRequest, { params }: { params: { path: string[] } }) {
  const storagePath = params.path.join("/");
  const r2Url = `${R2_BASE}/${storagePath}`;

  const r2Res = await fetch(r2Url);
  if (!r2Res.ok) {
    return new NextResponse("Not found", { status: 404 });
  }

  const blob = await r2Res.blob();
  const contentType = r2Res.headers.get("content-type") ?? "application/octet-stream";

  return new NextResponse(blob, {
    headers: {
      "Content-Type": contentType,
      "Cross-Origin-Resource-Policy": "cross-origin",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
