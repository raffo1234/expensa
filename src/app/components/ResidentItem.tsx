import Image from "next/image";
import { UserType } from "@/types/userType";
import { supabase } from "@/lib/supabase";
import { adminUsersKey, ICON_SIZE } from "@/constants";
import toast from "react-hot-toast";
import { mutate } from "swr";
import { formatTimestamp } from "@/utils/formatTimestamp";
import CircularSecondaryButton from "./CircularSecondaryButton";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useState } from "react";

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
  const [isLoading, setIsLoading] = useState(false);

  const href = `/admin/users/edit/${user.id}`;
  const isAssigned = !!user.supervisor_user_id;
  const isNotCurrentResident = isAssigned && user.supervisor_user_id !== currentUserId;

  const handleSelection = async () => {
    setIsLoading(true);
    try {
      await supabase
        .from("user")
        .update({ supervisor_user_id: isAssigned ? null : currentUserId })
        .eq("id", id);
      toast.success(`User was ${isAssigned ? "unassigned" : "assigned"} successfully!`);
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
      mutate(adminUsersKey);
    }
  };

  return (
    <div
      className={`
        ${isAssigned ? "bg-cyan-50/80 border-cyan-300" : "border-slate-200"}
        border text-center rounded-xl w-full truncate p-4
      `}
    >
      <Image
        src={image_url}
        width={52}
        height={52}
        className="rounded-full mb-4 inline-block"
        alt={`${first_name} ${last_name}`}
      />
      <div
        className="truncate font-semibold w-full mb-1 text-center"
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
        Desde: {formatTimestamp(created_at, "short")}
      </p>
      <div className="flex gap-2 items-center justify-center">
        <CircularSecondaryButton
          title={isAssigned ? "Unassign" : "Assign"}
          onClick={handleSelection}
          isDisabled={!isEditable || isNotCurrentResident || isLoading}
          isActive={isAssigned}
        >
          {isLoading ? (
            <Icon icon="solar:record-broken" className="animate-spin" fontSize={ICON_SIZE} />
          ) : isAssigned ? (
            <Icon icon="codicon:close" fontSize={ICON_SIZE} />
          ) : (
            <Icon icon="uil:check" fontSize={ICON_SIZE} />
          )}
        </CircularSecondaryButton>
        <CircularSecondaryButton href={href} title="View resident" isDisabled={isLoading}>
          <Icon icon="eva:diagonal-arrow-right-up-outline" fontSize={ICON_SIZE} />
        </CircularSecondaryButton>
      </div>
    </div>
  );
}
