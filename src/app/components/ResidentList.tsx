// components/ResidentList.tsx
import { UserType } from "@/types/userType";
import FieldsSection from "./FieldsSection";
import ResidentItem from "./ResidentItem";
import { useCheckPermissionsMap } from "@/hooks/useCheckPermissionsMap";
import { Permissions } from "@/types/propertyState";

export default function ResidentList({
  users,
  currentUserId,
  canAssignResident,
  canHaveResident,
}: {
  currentUserId: string;
  users: UserType[];
  canAssignResident: boolean;
  canHaveResident: boolean;
}) {
  const uniqueRoleIds = [...new Set(users.map((u) => u.role_id).filter(Boolean))] as string[];

  const { permissionsMap, isLoading: isLoadingAssignable } = useCheckPermissionsMap(
    uniqueRoleIds,
    Permissions.AVAILABLE_TO_BE_ASSIGNED,
  );

  if (!canHaveResident) return null;

  if (isLoadingAssignable)
    return (
      <div className="flex flex-col gap-4">
        <div className="w-full rounded-xl bg-slate-100 animate-pulse h-[164px]" />
      </div>
    );

  const assignableUsers = users.filter((u) => u.role_id && permissionsMap[u.role_id]);

  return (
    <FieldsSection>
      <h2 className="font-semibold">Residents</h2>
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}
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
