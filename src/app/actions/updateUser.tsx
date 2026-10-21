import { UserType } from "@/types/userType";
import { updateUserFields } from "@/actions/admin";

export const updateUser = async (id: string, newData: Partial<UserType>) => {
  try {
    await updateUserFields(id, newData as Parameters<typeof updateUserFields>[1]);
  } catch (error) {
    console.error(error);
  }
};
