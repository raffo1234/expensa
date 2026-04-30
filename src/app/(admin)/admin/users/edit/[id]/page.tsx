import EditUserContent from "@/components/EditUserContent";
import NoAccess from "@/components/NoAccess";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { checkPermissions } from "@/lib/checkPermissions";
import { Permissions } from "@/types/propertyState";
import userFetcher from "@/lib/userFetcher";
import usersFetcher from "@/lib/usersFetcher";
import Link from "next/link";

type Params = Promise<{ id: string }>;

export default async function Page({ params }: { params: Params }) {
  const [{ id }, currentUser] = await Promise.all([params, getCurrentUser()]);

  if (!id) return null;
  if (!currentUser) return <NoAccess />;
  if (!currentUser.roleId) return <NoAccess />;
  const [targetUser, allUsers] = await Promise.all([userFetcher(id), usersFetcher()]);

  if (!targetUser) return <NoAccess />;

  const uniqueRoleIds = [...new Set(allUsers?.map((u) => u.role_id).filter(Boolean))] as string[];

  const [canAssignResident, canHaveResident, assignableRoleIds] = await Promise.all([
    checkPermissions(currentUser.roleId, [Permissions.ASSIGN_RESIDENT]),
    targetUser.role_id
      ? checkPermissions(targetUser.role_id, [Permissions.CAN_HAVE_RESIDENT])
      : Promise.resolve({ [Permissions.CAN_HAVE_RESIDENT]: false }),
    Promise.all(
      uniqueRoleIds.map((roleId) =>
        checkPermissions(roleId, [Permissions.AVAILABLE_TO_BE_ASSIGNED]).then((result) => ({
          roleId,
          hasPermission: result?.[Permissions.AVAILABLE_TO_BE_ASSIGNED] === true,
        })),
      ),
    ).then((results) => results.filter((r) => r.hasPermission).map((r) => r.roleId)),
  ]);

  return (
    <>
      <div className="mb-3 flex justify-between items-center -mt-3">
        <h1 className="text-lg font-semibold">User</h1>
        <Link
          href="/admin/users"
          title="Users"
          className="p-2 hover:text-cyan-400 transition-colors duration-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24">
            <g fill="none" stroke="currentColor" strokeWidth="1.5">
              <path
                d="M11.142 20c-2.227 0-3.341 0-4.27-.501c-.93-.502-1.52-1.42-2.701-3.259l-.681-1.06C2.497 13.634 2 12.86 2 12s.497-1.634 1.49-3.18l.68-1.06c1.181-1.838 1.771-2.757 2.701-3.259S8.915 4 11.142 4h2.637c3.875 0 5.813 0 7.017 1.172S22 8.229 22 12s0 5.657-1.204 6.828S17.654 20 13.78 20z"
                opacity="0.5"
              />
              <path strokeLinecap="round" d="m15.5 9.5l-5 5m0-5l5 5" />
            </g>
          </svg>
        </Link>
      </div>
      <EditUserContent
        userId={id}
        currentUserId={currentUser.id}
        canAssignResident={canAssignResident[Permissions.ASSIGN_RESIDENT] ?? false}
        canHaveResident={canHaveResident[Permissions.CAN_HAVE_RESIDENT] ?? false}
        assignableRoleIds={assignableRoleIds}
        initialUsers={allUsers}
      />
    </>
  );
}
