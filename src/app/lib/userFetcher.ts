import { UserType } from "@/types/userType";
import { supabase } from "./supabase";

async function userFetcher(userId: string) {
  const { data } = (await supabase
    .from("user")
    .select(
      `
      *,
      role (
        id,
        name
      )
    `,
    )
    .eq("id", userId)
    .single()) as { data: UserType | null };
  return data;
}

export default userFetcher;
