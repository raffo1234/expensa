// ResidentItem.tsx
import Image from "next/image";
import { UserType } from "@/types/userType";
import { supabase } from "@/lib/supabase";
import { adminUsersKey } from "@/constants";
import toast from "react-hot-toast";
import { mutate } from "swr";
import PopoverInnerButton from "./PopoverInnerButton";
import { formatTimestamp } from "@/utils/formatTimestamp";

export default function ResidentItem({
  user,
  isEditable,
  currentUserId,
}: {
  user: UserType;
  isEditable: boolean;
  currentUserId: string;
}) {
  const { id, image_url, first_name, last_name, created_at, email, role } = user;

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
        ${isAssigned ? "border-cyan-400 bg-cyan-50" : "border-slate-200"}
        border rounded-xl disabled:opacity-50 disabled:pointer-events-none p-4
      `}
    >
      <PopoverInnerButton title={isAssigned ? "Unassign" : "Assign"}>
        <div>
          <Image
            src={image_url}
            width={52}
            height={52}
            className="rounded-full mb-4 inline-block"
            alt={`${first_name} ${last_name}`}
          />
          <div
            className="font-semibold w-full mb-1 text-center truncate"
            title={`${first_name} ${last_name ?? ""}`}
          >
            {first_name} {last_name ?? ""}
          </div>
          <div title={email} className="truncate text-xs text-slate-500 mb-3 text-center">
            {email}
          </div>
          <div className="text-xs text-cyan-700 px-2 py-0.5 bg-cyan-100 rounded-full w-fit mx-auto mb-4">
            {role?.name}
          </div>
          <p className="text-xs text-center mb-5 text-slate-600">
            Miembro desde: {formatTimestamp(created_at, "short")}
          </p>
        </div>
      </PopoverInnerButton>
    </button>
  );
}
