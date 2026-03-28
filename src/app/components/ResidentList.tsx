import { UserType } from "@/types/userType";
import FieldsSection from "./FieldsSection";
import ResidentItem from "./ResidentItem";
import useCheckPermission from "@/hooks/useCheckPermission";
import { useCheckPermissionsMap } from "@/hooks/useCheckPermissionsMap";
import { Permissions } from "@/types/propertyState";

export default function ResidentList({
  userRoleId,
  users,
  currentUserId,
  currentUserRoleId,
}: {
  currentUserRoleId: string;
  currentUserId: string;
  userRoleId: string;
  users: UserType[];
}) {
  const { hasPermission: canAssignResident, isLoading: isLoadingCanAssign } = useCheckPermission(
    currentUserRoleId,
    Permissions.ASSIGN_RESIDENT,
  );

  const { hasPermission: canHaveResident, isLoading: isLoadingCanHaveResident } =
    useCheckPermission(userRoleId, Permissions.CAN_HAVE_RESIDENT);

  const uniqueRoleIds = [...new Set(users.map((u) => u.role_id).filter(Boolean))] as string[];

  const { permissionsMap, isLoading: isLoadingAssignable } = useCheckPermissionsMap(
    uniqueRoleIds,
    Permissions.AVAILABLE_TO_BE_ASSIGNED,
  );

  if (isLoadingCanHaveResident || isLoadingCanAssign || isLoadingAssignable)
    return (
      <div className="flex flex-col gap-4">
        <div className="w-full rounded-xl bg-slate-100 animate-pulse h-[164px]"></div>
      </div>
    );

  if (!canHaveResident) return null;

  const assignableUsers = users.filter((u) => u.role_id && permissionsMap[u.role_id]);

  return (
    <FieldsSection>
      <h2 className="font-semibold">Residents</h2>
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
        }}
      >
        {assignableUsers.map((user) => (
          <ResidentItem
            key={user.id}
            isEditable={canAssignResident}
            user={user}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </FieldsSection>
  );
}
