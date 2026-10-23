import { unstable_serialize } from "swr";
import { findAccessibleWorkspaceBySlug } from "@/lib/access";
import { supabaseAdmin as supabase } from "@/lib/supabaseAdmin";
import { getMaterials } from "@/actions/materials";
import { getBrands } from "@/actions/brands";
import { getUnits } from "@/actions/units";

// Everything the expense forms (upload and edit) need to render, fetched on the
// server in one parallel round instead of a chain of requests from the browser.
// The result is handed to the client as SWR fallback data under the exact keys
// the forms already use, so they render filled in and revalidate in background.

async function rows<T>(query: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function loadExpenseFormLookups(slug: string) {
  // null (404) unless the caller owns or was assigned to this project.
  const workspace = await findAccessibleWorkspaceBySlug(slug);
  if (!workspace) return null;

  const wid = workspace.id;
  const [categories, providers, stages, levels, materials, brands, units] = await Promise.all([
    rows(supabase.from("category").select("id, name, color").eq("workspace_id", wid).order("name")),
    rows(supabase.from("provider").select("id, name, ruc").eq("workspace_id", wid).order("name")),
    rows(
      supabase
        .from("stage")
        .select("id, name, order, color")
        .eq("workspace_id", wid)
        .order("order"),
    ),
    rows(supabase.from("level").select("id, name, order").eq("workspace_id", wid).order("order")),
    getMaterials(wid),
    getBrands(wid),
    getUnits(wid),
  ]);

  return {
    workspace,
    fallback: {
      [unstable_serialize(["workspace", slug])]: workspace,
      [unstable_serialize(["categories", wid])]: categories,
      [unstable_serialize(["providers", wid])]: providers,
      [unstable_serialize(["stages", wid])]: stages,
      [unstable_serialize(["levels", wid])]: levels,
      [unstable_serialize(["materials", wid])]: materials,
      [unstable_serialize(["brands", wid])]: brands,
      [unstable_serialize(["units", wid])]: units,
    } as Record<string, unknown>,
  };
}
