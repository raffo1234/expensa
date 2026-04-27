import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cache } from "react";

type GetCurrentUserData = {
  id: string;
  role_id: string | null;
  template_id: string | null;
  role: {
    name: string;
  } | null;
};

export const getCurrentUser = cache(async () => {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !user?.email) return null;

  const { data, error } = await supabaseAdmin
    .from("user")
    .select("id, role_id, role(name)")
    .eq("id", user.id)
    .maybeSingle<GetCurrentUserData>();

  console.log("4. db data:", JSON.stringify(data));
  console.log("5. db error:", JSON.stringify(error));

  if (!data?.role_id || !data?.role) return null;

  return {
    id: user.id,
    email: user.email,
    roleId: data.role_id,
    templateId: data.template_id,
    roleName: data.role.name,
  };
});
