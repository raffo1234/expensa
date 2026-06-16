import { SupabaseClient } from "@supabase/supabase-js";
import { UserType } from "@/types/userType";
import useSWR from "swr";
import { UserStateEnum } from "@/enums/userStatesEnum";

interface FetchUserOptions {
  archivedFilter?: "active" | "archived" | "all" | Date | string;
  search?: string;
}

export const userFetcher = async (
  page: number,
  pageSize: number,
  supabaseClient: SupabaseClient,
  options?: FetchUserOptions,
) => {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseClient
    .from("user")
    .select(
      `
        *,
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
  const swrKey = ["admin-users", page, pageSize, options ?? null];

  return useSWR<{ data: UserType[] | null; count: number | null } | null>(swrKey, () =>
    userFetcher(page, pageSize, supabaseClient, options),
  );
};
