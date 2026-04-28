import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

type SupportedMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp"
  | "application/pdf";

interface ErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPPORTED_MIME_TYPES: SupportedMimeType[] = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];

const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"] as const;

// ─── Schema ───────────────────────────────────────────────────────────────────

const InvoiceSchema = z.object({
  amount: z.number().nullable().describe("Monto total a pagar, ej: 211.99"),
  currency: z.enum(["PEN", "USD", "EUR"]).nullable().describe("Moneda del documento"),
  paid_at: z.string().nullable().describe("Fecha de pago en formato YYYY-MM-DD"),
  issued_at: z.string().nullable().describe("Fecha de emisión en formato YYYY-MM-DD"),
  invoice_series: z.string().nullable().describe("Serie de la factura, ej: F786"),
  invoice_number: z.string().nullable().describe("Número de la factura, ej: 00007842"),
  provider_name: z.string().nullable().describe("Nombre del proveedor o empresa emisora"),
  notes: z.string().nullable().describe("Descripción del servicio o producto"),
  payment_method: z
    .enum(["Efectivo", "Tarjeta débito", "Tarjeta crédito", "Transferencia", "Yape / Plin", "Otro"])
    .nullable()
    .describe("Método de pago usado"),
});

export type InvoiceData = z.infer<typeof InvoiceSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSupportedMimeType(mime: string): mime is SupportedMimeType {
  return SUPPORTED_MIME_TYPES.includes(mime as SupportedMimeType);
}

function errorResponse(
  message: string,
  code: string,
  status: number,
  details?: unknown,
): NextResponse<ErrorResponse> {
  return NextResponse.json({ error: message, code, details }, { status });
}

/**
 * Builds the correct content part depending on mime type.
 * Images → type "image" with `image` field.
 * PDFs   → type "file"  with `data`  field.
 * Both accept raw base64 strings.
 */
function buildFilePart(base64: string, mimeType: SupportedMimeType) {
  if (mimeType.startsWith("image/")) {
    return { type: "image" as const, image: base64, mediaType: mimeType };
  }
  return { type: "file" as const, data: base64, mediaType: mimeType };
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse<InvoiceData | ErrorResponse>> {
  // ── 1. Config check ────────────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[invoice-extract] GEMINI_API_KEY is not set");
    return errorResponse("Server misconfiguration", "MISSING_API_KEY", 500);
  }

  // ── 2. Parse & validate body ───────────────────────────────────────────────
  let base64: string;
  let mimeType: SupportedMimeType;

  try {
    const body = await req.json();
    base64 = body?.base64;
    mimeType = body?.mimeType;
  } catch {
    return errorResponse("Invalid request body", "INVALID_BODY", 400);
  }

  if (!base64 || typeof base64 !== "string") {
    return errorResponse("Missing or invalid field: base64", "VALIDATION_ERROR", 400);
  }

  if (!mimeType || !isSupportedMimeType(mimeType)) {
    return errorResponse(
      `Unsupported mimeType. Accepted: ${SUPPORTED_MIME_TYPES.join(", ")}`,
      "UNSUPPORTED_MIME_TYPE",
      400,
    );
  }

  // ── 3. Try each model in order ─────────────────────────────────────────────
  const google = createGoogleGenerativeAI({ apiKey });
  let lastError: unknown = null;

  for (const modelId of MODELS) {
    try {
      const result = await generateText({
        model: google(modelId),
        output: Output.object({ schema: InvoiceSchema }),
        messages: [
          {
            role: "user",
            content: [
              buildFilePart(base64, mimeType),
              {
                type: "text",
                text: `Eres un experto en documentos fiscales latinoamericanos.
Extrae los datos del gasto de este documento.
Si un campo no existe en el documento usa null. Nunca inventes datos.`,
              },
            ],
          },
        ],
      });

      return NextResponse.json(result.output);
    } catch (err: unknown) {
      lastError = err;

      const isOverload =
        err instanceof Error &&
        (err.message.includes("503") ||
          err.message.includes("429") ||
          err.message.includes("overloaded") ||
          err.message.includes("unavailable"));

      if (isOverload) {
        console.warn(`[invoice-extract] ${modelId} overloaded, trying next model...`);
        continue;
      }

      console.error(`[invoice-extract] ${modelId} non-retryable error:`, err);
      return errorResponse(
        "AI service returned an error",
        "AI_ERROR",
        500,
        process.env.NODE_ENV === "development" ? String(err) : undefined,
      );
    }
  }

  // ── 4. All models exhausted ────────────────────────────────────────────────
  console.error("[invoice-extract] All models failed:", lastError);
  return errorResponse(
    "AI service is temporarily unavailable. Please try again in a few seconds.",
    "SERVICE_UNAVAILABLE",
    503,
  );
}
