import { adminRolesKey } from "@/constants";
import { supabase } from "@/lib/supabase";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useState } from "react";
import { mutate } from "swr";

export default function DeleteRole({ roleId }: { roleId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteItem = async (roleId: string) => {
    const confirmationMessage = confirm(
      "Are you sure you want to delete this item?"
    );
    if (!confirmationMessage) return;

    setIsDeleting(true);

    try {
      await supabase.from("role").delete().eq("id", roleId);

      await mutate(adminRolesKey);
    } catch (error) {
      console.error("Error deleting item", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      disabled={isDeleting}
      onClick={() => deleteItem(roleId)}
      type="button"
      title="Delete"
      className={`${isDeleting ? "cursor-no-drop" : "cursor-pointer"} absolute top-1/2 -translate-y-1/2 right-4 hover:bg-gray-50 w-11 h-11 rounded-full border-gray-100 border text-red-500 flex items-center justify-center`}
    >
      {isDeleting ? (
        <Icon
          icon="solar:record-broken"
          className="animate-spin"
          fontSize={24}
        />
      ) : (
        <Icon icon="solar:trash-bin-minimalistic-broken" fontSize={24} />
      )}
    </button>
  );
}
