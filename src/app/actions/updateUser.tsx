import { supabase } from "@/lib/supabase";
import { UserType } from "@/types/userType";

export const updateUser = async (id: string, newData: Partial<UserType>) => {
  try {
    await supabase.from("user").update(newData).eq("id", id);
  } catch (error) {
    console.error(error);
  }
};
