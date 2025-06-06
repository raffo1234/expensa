import useCheckPermission from "@/hooks/useCheckPermission";
import Image from "next/image";
import { Permissions } from "@/types/propertyState";
import { UserType } from "@/types/userType";
import { useState } from "react";

export default function ResidentItem({
  user,
  isEditable,
}: {
  user: UserType;
  isEditable: boolean;
}) {
  const [isActive, setIsActive] = useState(false);
  const { id, image_url, first_name, last_name, role_id } = user;

  const { hasPermission: canBeAssigned, isLoading: isLoadingCanHaveResident } =
    useCheckPermission(role_id as string, Permissions.AVAILABLE_TO_BE_ASSIGNED);

  const handleSelection = () => {
    setIsActive((prev) => !prev);
  };

  if (isLoadingCanHaveResident) return "loading...";
  if (!canBeAssigned) return null;

  return (
    <button
      type="button"
      disabled={!isEditable}
      className={`${isActive ? "border-cyan-100" : "border-transparent"} border-5 rounded-full cursor-pointer`}
    >
      <Image
        key={id}
        src={image_url}
        onClick={handleSelection}
        width={52}
        height={52}
        className={`${isActive ? "border-cyan-500" : "border-transparent"} rounded-full border`}
        alt={`${first_name} ${last_name}`}
        title={`${first_name} ${last_name}`}
      />
    </button>
  );
}
