export const buildDicomUrl = (storageUrl: string): string => {
  const STORAGE_DOMAIN = process.env.NEXT_PUBLIC_STORAGE_DOMAIN?.replace(/\/$/, "") ?? "";

  // Already a full URL (old data)
  if (storageUrl.startsWith("http://") || storageUrl.startsWith("https://")) {
    return storageUrl;
  }

  // New data — just the key
  return `${STORAGE_DOMAIN}/${storageUrl}`;
};
