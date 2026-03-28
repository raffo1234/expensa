import { UserType } from "@/types/userType";
import FieldsSection from "./FieldsSection";
import ResidentItem from "./ResidentItem";

export default function ResidentList({
  users,
  currentUserId,
  canAssignResident,
  canHaveResident,
  assignableRoleIds,
}: {
  currentUserId: string;
  userRoleId: string;
  users: UserType[];
  canAssignResident: boolean;
  canHaveResident: boolean;
  assignableRoleIds: string[];
}) {
  if (!canHaveResident) return null;

  const assignableUsers = users.filter((u) => u.role_id && assignableRoleIds.includes(u.role_id));

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
