import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { cache } from "react";

type GetCurrentUserData = {
  role_id: string;
  template_id: string | null;
  role: {
    name: string;
  };
};

export const getCurrentUser = cache(async () => {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !user?.email) return null;

  const { data } = (await supabase
    .from("user")
    .select("role_id, template_id, role(name)")
    .eq("id", user.id)
    .maybeSingle()) as { data: GetCurrentUserData | null };

  if (!data?.role_id) return null;

  return {
    id: user.id,
    email: user.email,
    roleId: data.role_id,
    templateId: data.template_id,
    roleName: data.role.name,
  };
});
