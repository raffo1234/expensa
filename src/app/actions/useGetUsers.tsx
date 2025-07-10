"server-only";

import { SupabaseClient } from "@supabase/supabase-js";
import { UserType } from "@/types/userType";
import useSWR from "swr";
import { UserStateEnum } from "@/enums/userStatesEnum";

interface FetchUserOptions {
  archivedFilter?: "active" | "archived" | "all" | Date | string;
  search?: string;
}

const userFetcher = async (args: [string, number, number, SupabaseClient, FetchUserOptions?]) => {
  const [, page, pageSize, supabaseClient, options] = args;

  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseClient
    .from("user")
    .select(
      `
        id,
        image_url,
        first_name,
        last_name,
        username,
        email,
        role_id,
        archived_at,
        created_at,
        role(id, name)
      `,
      { count: "exact" },
    )
    .range(from, to)
    .order("created_at", { ascending: false });

  const filter = options?.archivedFilter;
  const search = options?.search;

  if (filter === UserStateEnum.ACTIVE) {
    query = query.is("archived_at", null);
  } else if (filter === UserStateEnum.ARCHIVED) {
    query = query.not("archived_at", "is", null);
  } else if (filter instanceof Date || typeof filter === "string") {
    query = query.gte("archived_at", filter instanceof Date ? filter.toISOString() : filter);
  } else {
    query = query.is("archived_at", null);
  }

  if (search && search.trim() !== "") {
    const searchTerm = `%${search.trim()}%`;
    query = query.or(
      `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm}`,
    );
  }

  const { data, count, error } = (await query) as {
    data: UserType[] | null;
    count: number | null;
    error: Error;
  };

  if (error) {
    console.error("Error al obtener usuarios:", error.message);
    throw error;
  }

  return { data, count };
};

export const useGetUsers = (
  page: number,
  pageSize: number,
  supabaseClient: SupabaseClient,
  options?: FetchUserOptions,
) => {
  const swrKey = options
    ? ["admin-users", page, pageSize, supabaseClient, options]
    : ["admin-users", page, pageSize, supabaseClient];

  return useSWR<{ data: UserType[] | null; count: number | null } | null>(swrKey, userFetcher);
};
