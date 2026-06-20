import { createClient } from "@supabase/supabase-js";
import { writeFileSync, readFileSync } from "fs";

// ponytail: manual .env parse, no dotenv dep
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; }),
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// 1. Find mezco workspace
const { data: ws } = await supabase
  .from("workspace")
  .select("id, name")
  .ilike("name", "%mezco%")
  .single();

if (!ws) {
  console.error("Workspace 'mezco' not found");
  process.exit(1);
}

console.log(`Workspace: ${ws.name} (${ws.id})`);

// 2. Fetch all expenses
let all = [];
let page = 0;
const size = 1000;
while (true) {
  const { data } = await supabase
    .from("expense")
    .select("paid_at, invoice_series, invoice_number, amount, currency, payment_method, notes, provider:provider_id(name, ruc), category:category_id(name)")
    .eq("workspace_id", ws.id)
    .order("paid_at", { ascending: true })
    .range(page * size, (page + 1) * size - 1);
  if (!data || data.length === 0) break;
  all.push(...data);
  if (data.length < size) break;
  page++;
}

console.log(`Total expenses: ${all.length}`);

// 3. Group by month
const byMonth = {};
for (const e of all) {
  const month = e.paid_at ? e.paid_at.slice(0, 7) : "sin-fecha";
  if (!byMonth[month]) byMonth[month] = [];
  byMonth[month].push(e);
}

// 4. Build CSV
const escape = (v) => {
  if (v == null) return "";
  const s = String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"` : s;
};

const prov = (e) => Array.isArray(e.provider) ? e.provider[0] : e.provider;
const cat = (e) => Array.isArray(e.category) ? e.category[0] : e.category;

let csv = "﻿"; // BOM for Excel/Sheets
csv += "Mes,Fecha,Serie,Numero,Proveedor,RUC,Categoria,Metodo Pago,Monto,Moneda,Notas\n";

const months = Object.keys(byMonth).sort();
for (const month of months) {
  const expenses = byMonth[month];
  for (const e of expenses) {
    const p = prov(e);
    const c = cat(e);
    csv += [
      escape(month),
      escape(e.paid_at?.slice(0, 10)),
      escape(e.invoice_series),
      escape(e.invoice_number),
      escape(p?.name),
      escape(p?.ruc),
      escape(c?.name),
      escape(e.payment_method),
      escape(e.amount),
      escape(e.currency),
      escape(e.notes),
    ].join(",") + "\n";
  }
  // Summary row per month
  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  csv += `${escape(month)},,,,,,,,${total},,TOTAL ${month}\n`;
  csv += "\n";
}

const file = "mezco-gastos-mensual.csv";
writeFileSync(file, csv);
console.log(`Done: ${file}`);
