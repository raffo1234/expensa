"use client";

import useCheckPermission from "@/hooks/useCheckPermission";
import { Permissions } from "@/types/propertyState";
import { supabase } from "@/lib/supabase";
import useSWR from "swr";
import AddPac from "./AddPac";
import Pac from "./Pac";

const pacsFetcher = async (userId: string) => {
  const { data, error } = await supabase
    .from("pac")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
};

export default function PacsSettingsPageContent({
  userRoleId,
  userId,
}: {
  userRoleId: string;
  userId: string;
}) {
  const { hasPermission: canManagePacs, isLoading: isLoadingPermission } =
    useCheckPermission(userRoleId, Permissions.MANAGE_PACS);

  const {
    data: pacs,
    error,
    isLoading,
  } = useSWR("admin-pacs", () => pacsFetcher(userId));

  if (error) return null;
  if (isLoading || isLoadingPermission)
    return (
      <div className="w-full flex flex-col gap-3">
        <div className="w-full h-12 rounded-xl animate-pulse bg-white"></div>
        <div className="w-full h-12 rounded-xl animate-pulse bg-white"></div>
        <div className="w-full h-12 rounded-xl animate-pulse bg-white"></div>
        <div className="w-full h-12 rounded-xl animate-pulse bg-white"></div>
      </div>
    );
  if (!canManagePacs) return null;

  return (
    <>
      <div className="border border-gray-200 rounded-xl bg-white">
        {pacs?.map((pac) => <Pac key={pac.id} pac={pac} />)}
        <AddPac userId={userId} />
      </div>
    </>
  );
}
