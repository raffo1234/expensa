"use client";

import { message } from "antd";
import { supabase } from "@/lib/supabase";
import { mutate } from "swr";
import { Icon } from "@iconify/react";
import { ICON_SIZE } from "@/constants";

export default function DeleteUser({ userId }: { userId: string }) {
  const [messageApi] = message.useMessage();

  const successMessage = () => {
    messageApi.open({
      type: "success",
      content: "User deleted successfully!",
    });
  };

  const errorMessage = () => {
    messageApi.open({
      type: "error",
      content: "There was an error when deleting the user",
    });
  };

  const deleteUser = async () => {
    const confirmationMessage = confirm(
      "Esta acción no se puede deshacer. ¿Realmente desea eliminar este elemento?"
    );
    if (!confirmationMessage) return;

    try {
      await supabase.from("user").delete().eq("id", userId);
      await mutate("users");
      successMessage();
    } catch (error) {
      console.error("Error deleting user", error);
      errorMessage();
    }
  };

  return (
    <div id="edit-user">
      <button
        disabled
        onClick={deleteUser}
        type="button"
        className="w-11 h-11 rounded-full border-gray-100 border text-red-500 flex items-center justify-center"
      >
        <Icon icon="solar:trash-bin-minimalistic-broken" fontSize={ICON_SIZE} />
      </button>
    </div>
  );
}
