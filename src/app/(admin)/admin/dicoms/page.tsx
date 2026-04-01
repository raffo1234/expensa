import { auth } from "@/lib/auth";
import DicomsTable from "@/components/DicomsTable";
import { Suspense } from "react";
import UploadLink from "@/components/UploadLink";
import FallbackDicomsPage from "@/components/FallbackDicomsPage";
import NoAccess from "@/components/NoAccess";
import { getCurrentUser } from "@/lib/getCurrentUser";

async function DicomsTableLoader({ userId }: { userId: string }) {
  const user = await getCurrentUser();
  if (!user) return <NoAccess />;

  return <DicomsTable userId={userId} userRoleId={user.roleId} />;
}

export default async function Page() {
  const session = await auth();
  const userId = session?.user?.id;

  return (
    <>
      <div className="mb-6 w-fit">
        <UploadLink />
      </div>
      <Suspense fallback={<FallbackDicomsPage />}>
        {userId ? <DicomsTableLoader userId={userId} /> : null}
      </Suspense>
    </>
  );
}
