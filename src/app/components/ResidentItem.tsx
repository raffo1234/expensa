// ResidentItem.tsx
import Image from "next/image";
import { UserType } from "@/types/userType";
import { supabase } from "@/lib/supabase";
import { adminUsersKey } from "@/constants";
import toast from "react-hot-toast";
import { mutate } from "swr";
import PopoverInnerButton from "./PopoverInnerButton";

export default function ResidentItem({
  user,
  isEditable,
  currentUserId,
}: {
  user: UserType;
  isEditable: boolean;
  currentUserId: string;
}) {
  const { id, image_url, first_name, last_name } = user;

  const isAssigned = !!user.supervisor_user_id;
  const isNotCurrentResident = isAssigned && user.supervisor_user_id !== currentUserId;

  const handleSelection = async () => {
    try {
      await supabase
        .from("user")
        .update({ supervisor_user_id: isAssigned ? null : currentUserId })
        .eq("id", id);
      toast.success("User was assigned successfully!");
    } catch (error) {
      console.error(error);
    } finally {
      mutate(adminUsersKey);
    }
  };

  return (
    <button
      type="button"
      title={`${first_name} ${last_name}`}
      onClick={handleSelection}
      disabled={!isEditable || isNotCurrentResident}
      className={`
        ${isEditable ? "cursor-pointer" : ""}
        ${isAssigned ? "border-cyan-100" : "border-transparent"}
        border-5 rounded-full disabled:opacity-50 disabled:pointer-events-none
      `}
    >
      <PopoverInnerButton title={isAssigned ? "Unassign" : "Assign"}>
        <Image
          src={image_url}
          width={52}
          height={52}
          className={`${isAssigned ? "border-cyan-500" : "border-transparent"} rounded-full border`}
          alt={`${first_name} ${last_name}`}
        />
      </PopoverInnerButton>
    </button>
  );
}
