import MyStudiesPageContent from "@/components/MyStudiesPageContent";
import NoAccess from "@/components/NoAccess";
import { getCurrentUser } from "@/lib/getCurrentUser";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) return <NoAccess />;

  return <MyStudiesPageContent userId={user.id} userRoleId={user.roleId} />;
}
