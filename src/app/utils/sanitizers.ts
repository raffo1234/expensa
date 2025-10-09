import DOMPurify from "dompurify";

export const sanitizeInput = (value: string): string => {
  if (typeof value !== "string") {
    return value;
  }
  return DOMPurify.sanitize(value.trim());
};
