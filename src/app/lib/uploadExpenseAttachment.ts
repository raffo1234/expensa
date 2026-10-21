import {
  abortMultipartUpload,
  completeMultipartUpload,
  getPartPresignedUrl,
  initiateMultipartUpload,
  registerAttachment,
} from "@/actions/expenses";

const PART_SIZE = 5 * 1024 * 1024;

/**
 * Uploads a file straight to storage in 5 MB parts and registers it as an
 * attachment of the expense. The server chooses where the file goes and returns
 * a signed token; this only carries that token between steps.
 */
export async function uploadExpenseAttachment(
  file: File,
  expenseId: string,
  onProgress: (pct: number) => void,
  signal: AbortSignal,
): Promise<void> {
  const { token } = await initiateMultipartUpload(expenseId, file.type);

  const totalParts = Math.max(1, Math.ceil(file.size / PART_SIZE));
  const parts: { PartNumber: number; ETag: string }[] = [];

  try {
    for (let i = 0; i < totalParts; i++) {
      if (signal.aborted) throw new Error("Upload cancelado");

      const partNumber = i + 1;
      const chunk = file.slice(i * PART_SIZE, Math.min((i + 1) * PART_SIZE, file.size));
      const { url } = await getPartPresignedUrl(token, partNumber);

      const res = await fetch(url, {
        method: "PUT",
        body: chunk,
        headers: { "Content-Type": file.type },
        signal,
      });
      if (!res.ok) throw new Error(`Parte ${partNumber} falló: ${res.status}`);

      const etag = res.headers.get("ETag");
      if (!etag) throw new Error(`Sin ETag en parte ${partNumber}`);

      parts.push({ PartNumber: partNumber, ETag: etag });
      onProgress(Math.round((partNumber / totalParts) * 100));
    }

    await completeMultipartUpload(token, parts);
  } catch (err) {
    await abortMultipartUpload(token).catch(() => {});
    throw err;
  }

  const { error } = await registerAttachment(token, file.name);
  if (error) throw new Error(error);
}
