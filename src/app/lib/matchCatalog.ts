// Matches names read from an invoice to the workspace catalog (materials,
// brands, units). Only confident matches are returned: sizes like 3/8" vs 1/2"
// are different materials, so there is no fuzzy "contains" matching.

type CatalogItem = { id: string; name: string };

// Common Spanish and SUNAT unit codes mapped to one key per unit.
const UNIT_ALIASES: Record<string, string[]> = {
  unidad: ["unidad", "und", "unid", "unida", "niu", "u", "pza", "pieza", "zz"],
  bolsa: ["bolsa", "bls", "bg"],
  saco: ["saco", "sac"],
  kg: ["kg", "kgm", "kilo", "kilogramo"],
  tonelada: ["tonelada", "tn", "tne", "ton"],
  metro: ["metro", "m", "mtr", "ml", "metro lineal"],
  m2: ["m2", "mtk", "metro cuadrado"],
  m3: ["m3", "mtq", "metro cubico", "cubo"],
  litro: ["litro", "l", "ltr", "lt"],
  galon: ["galon", "gal", "gll", "gln"],
  rollo: ["rollo", "rll", "rol"],
  caja: ["caja", "cja", "bx"],
  paquete: ["paquete", "pqt", "pk"],
  varilla: ["varilla", "var"],
  plancha: ["plancha", "pl"],
  balde: ["balde", "bal"],
  millar: ["millar", "mll", "mil"],
};

const UNIT_KEY = new Map(
  Object.entries(UNIT_ALIASES).flatMap(([key, aliases]) => aliases.map((a) => [a, key])),
);

function singular(word: string) {
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

export function normalizeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/["”“'´`]/g, "") // 1/2" → 1/2
    .replace(/[^a-z0-9/.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map(singular)
    .join(" ");
}

function unitKey(name: string) {
  const n = normalizeName(name).replace(/\./g, "");
  return UNIT_KEY.get(n) ?? n;
}

function findBy(
  name: string | null | undefined,
  catalog: CatalogItem[],
  key: (s: string) => string,
): CatalogItem | null {
  if (!name?.trim()) return null;
  const target = key(name);
  return catalog.find((item) => key(item.name) === target) ?? null;
}

export const matchMaterial = (name: string | null | undefined, catalog: CatalogItem[]) =>
  findBy(name, catalog, normalizeName);

export const matchBrand = (name: string | null | undefined, catalog: CatalogItem[]) =>
  findBy(name, catalog, normalizeName);

export const matchUnit = (name: string | null | undefined, catalog: CatalogItem[]) =>
  findBy(name, catalog, unitKey);
