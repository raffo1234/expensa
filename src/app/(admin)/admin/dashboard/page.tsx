import { getWorkspaces } from "@/actions/dashboard";
import DashboardClient from "@/components/DashboardClient";

export default async function DashboardPage() {
  const workspaces = await getWorkspaces();
  const now = new Date();

  return (
    <DashboardClient
      workspaces={workspaces}
      defaultYear={now.getFullYear()}
      defaultMonth={now.getMonth() + 1}
    />
  );
}
