// lib/getPresignedPutUrl.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const CLOUDFLARE_R2_ENDPOINT = process.env.CLOUDFLARE_R2_ENDPOINT;
const CLOUDFLARE_R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const CLOUDFLARE_R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const CLOUDFLARE_R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME;

const r2 =
    CLOUDFLARE_R2_ENDPOINT &&
        CLOUDFLARE_R2_ACCESS_KEY_ID &&
        CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
        CLOUDFLARE_R2_BUCKET_NAME
        ? new S3Client({
            endpoint: CLOUDFLARE_R2_ENDPOINT,
            region: "auto",
            credentials: {
                accessKeyId: CLOUDFLARE_R2_ACCESS_KEY_ID,
                secretAccessKey: CLOUDFLARE_R2_SECRET_ACCESS_KEY,
            },
        })
        : null;

export const getPresignedPutUrl = async (
    storagePath: string,
    expiresIn = 3600 // 1 hour — enough for a large zip upload
): Promise<string> => {
    if (!r2 || !CLOUDFLARE_R2_BUCKET_NAME) {
        throw new Error("R2 client not initialized — check environment variables");
    }

    const command = new PutObjectCommand({
        Bucket: CLOUDFLARE_R2_BUCKET_NAME,
        Key: storagePath,
        ContentType: "application/zip",
    });

    return getSignedUrl(r2, command, { expiresIn });
};