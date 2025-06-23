import { sanitize } from "./sanitize";
import uploadFileToR2 from "./uploadFileToR2";

export default async function uploadSignedFile(
  file: File,
  now: string,
  onProgress: (progress: number) => void
) {
  const filename = sanitize(`${now}_${file.name}`);

  try {
    const response = await fetch("/api/generate-r2-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filename }),
    });

    const data = await response.json();

    if (response.ok && data?.signedUrl) {
      const signedUrl = await uploadFileToR2(data.signedUrl, file, onProgress);

      return signedUrl;
    } else {
      console.error(data?.error || "Failed to generate upload URL.");
      return null;
    }
  } catch (error) {
    console.error("Error getting presigned URL:", error);
    return null;
  }
}
