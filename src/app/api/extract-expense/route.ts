import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { base64, mimeType } = await req.json();

    const API_KEY = process.env.GEMINI_API_KEY;
    // Usamos v1beta para mayor compatibilidad con modelos 2.x
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64,
                },
              },
              {
                text: `Eres un experto en extracción de datos contables.
                Analiza la imagen y devuelve los datos del gasto estrictamente en formato JSON.

                REGLAS CRÍTICAS:
                1. Devuelve SOLAMENTE el objeto JSON, sin texto adicional, ni bloques de código markdown.
                2. Usa este esquema:
                {
                  "amount": "number (ej: 150.50)",
                  "currency": "PEN, USD o EUR",
                  "paid_at": "YYYY-MM-DD",
                  "issued_at": "YYYY-MM-DD",
                  "invoice_series": "string",
                  "invoice_number": "string",
                  "provider_name": "string",
                  "notes": "string",
                  "payment_method": "Efectivo, Tarjeta débito, Tarjeta crédito, Transferencia, Yape / Plin, o Otro"
                }`,
              },
            ],
          },
        ],
        // Eliminamos response_mime_type para evitar el Error 400
        generationConfig: {
          temperature: 0.1,
          topP: 1,
          maxOutputTokens: 1000,
        },
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: "Gemini Error", details: result }, { status: response.status });
    }

    // Limpieza manual del texto por si la IA incluye markdown
    let text = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // Si la IA devuelve ```json ... ```, lo limpiamos
    text = text.replace(/```json|```/g, "").trim();

    try {
      const parsedData = JSON.parse(text);
      return NextResponse.json(parsedData);
    } catch (parseError) {
      console.error("Error parseando JSON de Gemini:", text);
      return NextResponse.json({ error: "Invalid JSON from AI", raw: text }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
