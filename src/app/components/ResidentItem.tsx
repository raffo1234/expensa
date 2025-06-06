import useCheckPermission from "@/hooks/useCheckPermission";
import Image from "next/image";
import { Permissions } from "@/types/propertyState";
import { UserType } from "@/types/userType";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { mutate } from "swr";

export default function ResidentItem({
  user,
  isEditable,
  currentUserId,
}: {
  user: UserType;
  isEditable: boolean;
  currentUserId: string;
}) {
  const { id, image_url, first_name, last_name, role_id } = user;

  const { hasPermission: canBeAssigned, isLoading } = useCheckPermission(
    role_id as string,
    Permissions.AVAILABLE_TO_BE_ASSIGNED
  );

  const handleSelection = () => {
    updateUser(
      "supervisor_user_id",
      user.supervisor_user_id ? null : currentUserId
    );
  };

  const updateUser = async (fieldName: string, value: string | null) => {
    try {
      await supabase
        .from("user")
        .update({ [fieldName]: value })
        .eq("id", user.id);
    } catch (error) {
      console.error(error);
    } finally {
      mutate("admin-users");
      toast.success("User was assigned successfully!");
    }
  };

  if (isLoading) return "loading...";
  if (!canBeAssigned) return null;

  return (
    <button
      type="button"
      disabled={!isEditable}
      className={`${isEditable ? "cursor-pointer" : ""} ${user.supervisor_user_id ? "border-cyan-100" : "border-transparent"} border-5 rounded-full`}
    >
      <Image
        key={id}
        src={image_url}
        onClick={handleSelection}
        width={52}
        height={52}
        className={`${user.supervisor_user_id ? "border-cyan-500" : "border-transparent"} rounded-full border`}
        alt={`${first_name} ${last_name}`}
        title={`${first_name} ${last_name}`}
      />
    </button>
  );
}
