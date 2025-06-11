"use client";

import useCheckPermission from "@/hooks/useCheckPermission";
import { Permissions } from "@/types/propertyState";
// import PacsQuery from "./PacsQuery";
import { supabase } from "@/lib/supabase";
import useSWR from "swr";
import AddPac from "./AddPac";
import Pac from "./Pac";

const pacsFetcher = async () => {
  const { data, error } = await supabase
    .from("pac")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
};

export default function PacsSettingsPageContent({
  userRoleId,
}: {
  userRoleId: string;
}) {
  const { hasPermission: canManagePacs, isLoading: isLoadingPermission } =
    useCheckPermission(userRoleId, Permissions.MANAGE_PACS);

  const { data: pacs, error, isLoading } = useSWR("admin-pacs", pacsFetcher);

  if (error) return null;
  if (isLoading || isLoadingPermission) return "loading ...";
  if (!canManagePacs) return null;

  return (
    <>
      <div className="border border-gray-200 rounded-xl bg-white">
        {pacs?.map((pac) => <Pac key={pac.id} pac={pac} />)}
        <AddPac />
      </div>
      {/* <PacsQuery userRoleId={userRoleId} /> */}
    </>
  );
}
