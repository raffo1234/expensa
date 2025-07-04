export const sanitize = (string: string) =>
  string.replace(/[^a-z0-9_\-\.]/gi, "_");
