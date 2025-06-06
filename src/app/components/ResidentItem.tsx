import useCheckPermission from "@/hooks/useCheckPermission";
import Image from "next/image";
import { Permissions } from "@/types/propertyState";
import { UserType } from "@/types/userType";

export default function ResidentItem({
  user,
  isEditable,
}: {
  user: UserType;
  isEditable: boolean;
}) {
  console.log(isEditable);
  const { id, image_url, first_name, last_name, role_id } = user;

  const { hasPermission: canBeAssigned, isLoading: isLoadingCanHaveResident } =
    useCheckPermission(role_id as string, Permissions.AVAILABLE_TO_BE_ASSIGNED);
  console.log(role_id);

  if (isLoadingCanHaveResident) return "loading...";
  if (!canBeAssigned) return null;

  return (
    <Image
      key={id}
      src={image_url}
      width={48}
      height={48}
      className={`${true ? "border-cyan-200" : "border-transparent"} border-3 rounded-full`}
      alt={`${first_name} ${last_name}`}
      title={`${first_name} ${last_name}`}
    />
  );
}
