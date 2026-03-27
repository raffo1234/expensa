import { supabase } from "@/lib/supabase";
import { UserType } from "@/types/userType";

export const residentsFetcher = async (userId: string) => {
  const { data } = (await supabase
    .from("user")
    .select(
      `
        *,
        role (
          id,
          name
        ),
        template: user_template_id_fkey (
          id,
          name
        ),
        residents: user (
          id,
          first_name,
          last_name,
          role(id, name),
          image_url
        )
      `,
    )
    .eq("id", userId)
    .maybeSingle()) as { data: UserType | null };

  return data;
};
