import { auth } from "@/lib/auth";
import DicomsTable from "@/components/DicomsTable";

export default async function Page() {
  const session = await auth();
  const user = session?.user;

  if (!user?.id || !user.role_id) return null;

  return <DicomsTable userId={user.id} userRoleId={user.role_id} />;
}
