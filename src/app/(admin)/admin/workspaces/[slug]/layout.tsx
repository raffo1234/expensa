import NoAccess from "@/components/NoAccess";
import { AccessError, requireWorkspaceAccessBySlug } from "@/lib/access";

// Every page under a workspace (expenses, materials, providers, upload, edit)
// renders only for users who created or were assigned to that workspace.
export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    await requireWorkspaceAccessBySlug(slug);
  } catch (err) {
    if (err instanceof AccessError) return <NoAccess />;
    throw err;
  }
  return children;
}
