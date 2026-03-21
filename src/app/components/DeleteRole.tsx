import { adminRolesKey } from "@/constants";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { mutate } from "swr";
import DeleteButton from "./DeleteButton";

export default function DeleteRole({ roleId }: { roleId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const title = "Delete";

  const deleteItem = async (roleId: string) => {
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
    <DeleteButton
      classNames="absolute top-1/2 -translate-y-1/2 right-4"
      isDeleting={isDeleting}
      onClick={() => deleteItem(roleId)}
      title={title}
    />
  );
}
