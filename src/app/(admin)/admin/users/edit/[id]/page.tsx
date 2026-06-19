import EditUserContent from "@/components/EditUserContent";
import FormSection from "@/components/FormSection";
import NoAccess from "@/components/NoAccess";
import { getCurrentUser } from "@/lib/getCurrentUser";

type Params = Promise<{ id: string }>;

export default async function Page({ params }: { params: Params }) {
  const [{ id }, currentUser] = await Promise.all([params, getCurrentUser()]);
  console.log("Current user in EditUser page:", currentUser); // Debug log
  if (!id) return null;
  if (!currentUser) return <NoAccess />;

  return (
    <FormSection title="Edit User" backUrl="/admin/users">
      <EditUserContent userId={id} />
    </FormSection>
  );
}
