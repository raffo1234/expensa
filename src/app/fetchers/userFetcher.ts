import { supabase } from "@/lib/supabase";
import { UserType } from "@/types/userType";

const userFetcher = async () => {
  const { data } = (await supabase
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
        role(id, name)
        `
    )
    .order("created_at", { ascending: false })) as { data: UserType[] | null };
  return data;
};

export default userFetcher;
