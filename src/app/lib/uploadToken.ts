import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// A signed, short-lived receipt for an attachment upload. The server decides
// the storage key when the upload starts and hands the browser this token; every
// later step (part URLs, complete, abort, register) verifies the signature and
// reads the key from it. The browser never sends a storage path, so it can't
// point an upload at someone else's files.

export type UploadTokenPayload = {
  key: string; // storage key chosen by the server
  uploadId: string; // R2 multipart upload id
  expenseId: string;
  userId: string;
  exp: number; // unix ms
};

const TTL_MS = 60 * 60 * 1000; // long enough for a large file on a slow connection

function secret(): string {
  const s = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

function sign(data: string): string {
  // Domain-separated so this signature can't be reused for any other purpose.
  return createHmac("sha256", secret()).update(`upload-token:v1:${data}`).digest("base64url");
}

export function createUploadToken(payload: Omit<UploadTokenPayload, "exp">): string {
  const data = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + TTL_MS })).toString(
    "base64url",
  );
  return `${data}.${sign(data)}`;
}

/** Returns the payload only if the signature is valid, unexpired and issued to this user. */
export function verifyUploadToken(token: string, userId: string): UploadTokenPayload | null {
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;

  const expected = Buffer.from(sign(data));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as UploadTokenPayload;
    if (payload.exp < Date.now() || payload.userId !== userId) return null;
    return payload;
  } catch {
    return null;
  }
}
