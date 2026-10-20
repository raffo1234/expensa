import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { generateText, Output } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import {
  normalizeItemsToPaid,
  resolveTaxStatus,
  type PaidItem,
  type TaxStatus,
  type TotalsCheck,
} from "@/lib/invoiceTax";

// Reading a long invoice can take a while; don't let the platform cut it short.
export const maxDuration = 60;

// ─── Types ────────────────────────────────────────────────────────────────────

type SupportedMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp"
  | "application/pdf";

type Catalog = { materials: string[]; brands: string[]; units: string[] };

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

const CLAUDE_MODEL = "claude-opus-5-5";
const GEMINI_MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash"] as const;

// Keep the prompt bounded on workspaces with very large catalogs.
const MAX_CATALOG_NAMES = 300;

// ─── Schema ───────────────────────────────────────────────────────────────────

const ItemSchema = z.object({
  description: z.string().describe("Descripción literal de la línea tal como aparece"),
  material: z
    .string()
    .describe(
      'Nombre del material sin la marca, incluyendo medida o especificación (ej: Barra corrugada 1/2" G60). Si coincide con un material del catálogo, usa exactamente ese nombre',
    ),
  brand: z
    .string()
    .nullable()
    .describe(
      "Marca, si aparece. Si coincide con una marca del catálogo, usa exactamente ese nombre",
    ),
  quantity: z.number().describe("Cantidad"),
  unit: z
    .string()
    .nullable()
    .describe(
      "Unidad de medida. Si coincide con una unidad del catálogo, usa exactamente ese nombre; si no, escríbela completa (unidad, bolsa, kg, metro…)",
    ),
  unit_price: z.number().nullable().describe("Precio unitario tal como figura en la línea"),
  line_total: z.number().nullable().describe("Valor total de la línea tal como figura"),
  is_material: z
    .boolean()
    .describe(
      "true si es un bien físico (material de construcción, herramienta, insumo); false si es un servicio (seguro, transporte, pasaje, flete, mano de obra, alquiler, comisión, suscripción)",
    ),
  taxed: z
    .boolean()
    .nullable()
    .describe(
      "true si la línea está gravada con IGV, false si es exonerada o inafecta, null si el documento no lo indica",
    ),
});

const InvoiceSchema = z.object({
  provider_ruc: z.string().nullable().describe("RUC del proveedor, ej: 20129646099"),
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
  document_type: z
    .enum(["factura", "boleta", "nota_venta", "recibo", "voucher", "otro"])
    .nullable()
    .describe(
      "Tipo de documento. voucher = constancia de pago (transferencia, Yape/Plin, depósito), no es un comprobante de compra",
    ),
  tax_summary: z
    .object({
      taxable: z.number().nullable().describe("Op. Gravada"),
      exempt: z.number().nullable().describe("Op. Exonerada"),
      unaffected: z.number().nullable().describe("Op. Inafecta"),
      igv: z.number().nullable().describe("Monto de IGV; 0 si el documento indica que no hay IGV"),
      total: z.number().nullable().describe("Importe total"),
    })
    .nullable()
    .describe("Resumen de impuestos al pie del documento, con los montos tal como figuran"),
  items: z
    .array(ItemSchema)
    .describe(
      "Líneas de detalle del documento. Vacío si el documento no tiene una tabla de detalle",
    ),
});

type InvoiceExtraction = z.infer<typeof InvoiceSchema>;

export type ExtractedExpense = Omit<InvoiceExtraction, "items"> & {
  items: PaidItem[];
  tax_status: TaxStatus | null;
  totals_check: TotalsCheck;
  source: "claude" | "gemini";
};

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(catalog: Catalog) {
  const list = (names: string[]) =>
    names.length ? names.slice(0, MAX_CATALOG_NAMES).join(" | ") : "(vacío)";

  return `Eres un experto en documentos fiscales peruanos. Extrae los datos del gasto de este documento.

Reglas generales:
- Si un campo no existe en el documento usa null. Nunca inventes datos.
- Montos como números, sin separadores de miles (12,955.00 → 12955).
- "payment_method" es el medio de pago (efectivo, tarjeta, transferencia, Yape/Plin). "Contado" o "Crédito" en la forma de pago NO indican el medio: si el documento no dice el medio, usa null.
- Para "notes", combina cualquier nota literal del documento con un resumen breve del servicio o producto, solo con datos que puedas leer.

Líneas de detalle ("items"):
- Una entrada por cada línea de la tabla de detalle del documento, en el mismo orden.
- Si el documento no tiene una tabla de detalle (por ejemplo, una constancia de transferencia o Yape), "items" debe ser []. Nunca inventes líneas a partir del monto o del nombre del proveedor.
- Marca "is_material" según sea un bien físico o un servicio.
- "material" lleva la medida o especificación (3/8", 1/2", 42.5 kg, 9 m…) porque cada medida es un material distinto; la marca va aparte en "brand".
- Copia "unit_price" y "line_total" tal como figuran; no calcules IGV.
- Unidades abreviadas o códigos SUNAT: NIU/UND/UNIDA = unidad, BG/BLS = bolsa, KGM = kg, MTR = metro, MTK = m2, MTQ = m3, GLL = galón.

Resumen de impuestos ("tax_summary"): copia Op. Gravada, Op. Exonerada, Op. Inafecta, IGV e Importe Total tal como aparecen. Si el documento indica que no lleva IGV, usa igv = 0.

Catálogo del workspace (si un nombre corresponde al mismo producto, úsalo exactamente):
- Materiales: ${list(catalog.materials)}
- Marcas: ${list(catalog.brands)}
- Unidades: ${list(catalog.units)}`;
}

// ─── Providers ────────────────────────────────────────────────────────────────

async function extractWithClaude(
  base64: string,
  mimeType: SupportedMimeType,
  prompt: string,
): Promise<InvoiceExtraction> {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY

  const fileBlock =
    mimeType === "application/pdf"
      ? {
          type: "document" as const,
          source: { type: "base64" as const, media_type: mimeType, data: base64 },
        }
      : {
          type: "image" as const,
          source: { type: "base64" as const, media_type: mimeType, data: base64 },
        };

  const response = await client.beta.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    // If the model declines for policy reasons, the API retries on its
    // recommended fallback model inside the same call.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      // Reading an invoice is a well-defined task; low effort keeps it fast.
      effort: "low",
      format: betaZodOutputFormat(InvoiceSchema),
    },
    messages: [{ role: "user", content: [fileBlock, { type: "text", text: prompt }] }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error(
      `Claude declined the request (${response.stop_details?.category ?? "unknown"})`,
    );
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error("Claude response was cut off (max_tokens)");
  }
  if (!response.parsed_output) {
    throw new Error("Claude returned no parseable output");
  }
  return response.parsed_output;
}

async function extractWithGemini(
  base64: string,
  mimeType: SupportedMimeType,
  prompt: string,
): Promise<InvoiceExtraction> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const google = createGoogleGenerativeAI({ apiKey });
  const filePart = mimeType.startsWith("image/")
    ? { type: "image" as const, image: base64, mediaType: mimeType }
    : { type: "file" as const, data: base64, mediaType: mimeType };

  let lastError: unknown = null;
  for (const modelId of GEMINI_MODELS) {
    try {
      const result = await generateText({
        model: google(modelId),
        output: Output.object({ schema: InvoiceSchema }),
        messages: [{ role: "user", content: [filePart, { type: "text", text: prompt }] }],
      });
      return result.output;
    } catch (err) {
      lastError = err;
      console.warn(`[invoice-extract] gemini ${modelId} failed, trying next model`, err);
    }
  }
  throw lastError ?? new Error("Gemini failed");
}

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

function parseCatalog(raw: unknown): Catalog {
  const names = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : [];
  const c = (raw ?? {}) as Record<string, unknown>;
  return { materials: names(c.materials), brands: names(c.brands), units: names(c.units) };
}

function finalize(data: InvoiceExtraction, source: ExtractedExpense["source"]): ExtractedExpense {
  // Every line counts toward the invoice total (a freight charge too), but only
  // physical goods become materials.
  const { items, check } = normalizeItemsToPaid(data.items ?? [], data.tax_summary, data.amount);
  return {
    ...data,
    items: items.filter((item) => item.is_material),
    totals_check: check,
    tax_status: resolveTaxStatus({
      documentType: data.document_type,
      igv: data.tax_summary?.igv ?? null,
      hasInvoiceRef: !!(data.invoice_series && data.invoice_number),
    }),
    source,
  };
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
): Promise<NextResponse<ExtractedExpense | ErrorResponse>> {
  let base64: string;
  let mimeType: string;
  let catalog: Catalog;

  try {
    const body = await req.json();
    base64 = body?.base64;
    mimeType = body?.mimeType;
    catalog = parseCatalog(body?.catalog);
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

  const prompt = buildPrompt(catalog);

  // Claude first; Gemini stays as a backup while the switch settles in.
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const data = await extractWithClaude(base64, mimeType, prompt);
      return NextResponse.json(finalize(data, "claude"));
    } catch (err) {
      const detail =
        err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : String(err);
      console.warn("[invoice-extract] Claude failed, falling back to Gemini:", detail);
    }
  } else {
    console.warn("[invoice-extract] ANTHROPIC_API_KEY is not set, using Gemini");
  }

  try {
    const data = await extractWithGemini(base64, mimeType, prompt);
    return NextResponse.json(finalize(data, "gemini"));
  } catch (err) {
    console.error("[invoice-extract] All providers failed:", err);
    return errorResponse(
      "AI service is temporarily unavailable. Please try again in a few seconds.",
      "SERVICE_UNAVAILABLE",
      503,
      process.env.NODE_ENV === "development" ? String(err) : undefined,
    );
  }
}
