import UploadExpensePage from "@/components/UploadExpensePage";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { redirect } from "next/navigation";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <UploadExpensePage userId={user.id} />;
}
