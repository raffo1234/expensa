import { UserType } from "@/types/userType";
import FieldsSection from "./FieldsSection";
import ResidentItem from "./ResidentItem";
import useCheckPermission from "@/hooks/useCheckPermission";
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
  const {
    hasPermission: canAssignResident,
    isLoading: isLoadingCanAssignResident,
  } = useCheckPermission(currentUserRoleId, Permissions.ASSIGN_RESIDENT);

  const {
    hasPermission: canHaveResident,
    isLoading: isLoadingCanHaveResident,
  } = useCheckPermission(userRoleId, Permissions.CAN_HAVE_RESIDENT);

  if (isLoadingCanHaveResident || isLoadingCanAssignResident)
    return "loading...";

  if (!canHaveResident) return null;

  return (
    <FieldsSection>
      <h2 className="font-semibold">Residents</h2>
      <div className="flex gap-1 items-center">
        {users?.map((user) => {
          return user.role_id ? (
            <ResidentItem
              isEditable={canAssignResident}
              key={user.id}
              user={user}
              currentUserId={currentUserId}
            />
          ) : null;
        })}
      </div>
    </FieldsSection>
  );
}
