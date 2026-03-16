// app/api/presign-upload/route.ts
import { getPresignedPutUrl } from "@/lib/getPresignedPutUrl";

export async function POST(req: Request) {
    const { path } = await req.json();

    if (!path) {
        return Response.json({ error: "Missing path" }, { status: 400 });
    }

    const signedUrl = await getPresignedPutUrl(path);
    return Response.json({ signedUrl });
}