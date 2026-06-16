import UploadExpensePage from "@/components/UploadExpensePage";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { checkPermissions } from "@/lib/checkPermissions";
import { Permissions } from "@/types/propertyState";
import NoAccess from "@/components/NoAccess";
import { redirect } from "next/navigation";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roleId) return <NoAccess />;

  const permissions = await checkPermissions(user.roleId, [Permissions.CREATE_EXPENSE]);

  if (!permissions[Permissions.CREATE_EXPENSE]) return <NoAccess />;

  return <UploadExpensePage userId={user.id} />;
}
