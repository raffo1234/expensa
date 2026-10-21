import { UserType } from "@/types/userType";
import useSWR from "swr";
import { listUsersPage, type UserListOptions } from "@/actions/admin";

export const useGetUsers = (page: number, pageSize: number, options?: UserListOptions) => {
  const swrKey = ["admin-users", page, pageSize, options ?? null];

  return useSWR<{ data: UserType[] | null; count: number | null } | null>(
    swrKey,
    () => listUsersPage(page, pageSize, options),
    // Keep the current cards while the next page/search loads.
    { keepPreviousData: true },
  );
};
