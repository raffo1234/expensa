import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cache } from "react";

type GetCurrentUserData = {
  id: string;
  template_id: string | null;
  role_id: string | null;
  role: {
    name: string;
  } | null;
};

export const getCurrentUser = cache(async () => {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !user?.email) return null;

  const { data } = await supabaseAdmin
    .from("user")
    .select("id, role_id, template_id, role(name)")
    .eq("id", user.id)
    .maybeSingle<GetCurrentUserData>();

  if (!data) return null;

  return {
    id: user.id,
    email: user.email,
    roleId: data.role_id ?? null,
    roleName: data.role?.name ?? null,
  };
});
