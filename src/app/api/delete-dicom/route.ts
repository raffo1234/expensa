import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const CLOUDFLARE_R2_ENDPOINT = process.env.CLOUDFLARE_R2_ENDPOINT;
const CLOUDFLARE_R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const CLOUDFLARE_R2_SECRET_ACCESS_KEY =
  process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const CLOUDFLARE_R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;

if (
  !CLOUDFLARE_R2_ENDPOINT ||
  !CLOUDFLARE_R2_ACCESS_KEY_ID ||
  !CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
  !CLOUDFLARE_R2_BUCKET_NAME
) {
  console.error(
    "Server-side error: Missing one or more Cloudflare R2 environment variables."
  );
  // In production, you might want to throw an error and prevent server startup
}

function getKeyFromUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname.substring(1);
  } catch (error) {
    console.error(
      "Error parsing URL or extracting key in getKeyFromUrl:",
      error
    );
    return null;
  }
}

export async function DELETE(request: Request) {
  const { id, dicomUrl } = await request.json(); // Use request.json() for App Router

  if (!id || !dicomUrl) {
    return NextResponse.json(
      { message: "Missing id or dicomUrl in request body." },
      { status: 400 }
    );
  }

  try {
    const fileKey = getKeyFromUrl(dicomUrl);

    if (!fileKey || fileKey === "") {
      return NextResponse.json(
        {
          message: "Could not extract a valid file key from the provided URL.",
        },
        { status: 400 }
      );
    }

    const r2 = new S3Client({
      endpoint: CLOUDFLARE_R2_ENDPOINT,
      region: "auto",
      credentials: {
        accessKeyId: CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    });

    const deleteParams = {
      Bucket: CLOUDFLARE_R2_BUCKET_NAME!,
      Key: fileKey,
    };

    try {
      const deleteCommand = new DeleteObjectCommand(deleteParams);
      await r2.send(deleteCommand);
      console.warn(`Successfully deleted ${fileKey} from R2.`);
    } catch (r2Error) {
      console.error("Cloudflare R2 deletion failed on server:", r2Error);
      return NextResponse.json(
        { message: "Failed to delete file from Cloudflare R2 storage." },
        { status: 500 }
      );
    }

    // --- Supabase Database Record Deletion Logic ---
    const { error: errorDelete } = await supabase
      .from("dicom")
      .delete()
      .eq("id", id);

    if (errorDelete) {
      console.error("Supabase record deletion failed on server:", errorDelete);
      return NextResponse.json(
        { message: "Failed to delete record from the database." },
        { status: 500 }
      );
    }

    // Send a success response
    return NextResponse.json(
      { message: "Item deleted successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "An unexpected server-side error occurred during deletion:",
      error
    );
    return NextResponse.json(
      { message: "An unexpected server error occurred during deletion." },
      { status: 500 }
    );
  }
}
