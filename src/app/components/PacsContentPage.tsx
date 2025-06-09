"use client";

import useCheckPermission from "@/hooks/useCheckPermission";
import { Permissions } from "@/types/propertyState";
import PacsQuery from "./PacsQuery";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import useSWR from "swr";
import AddPac from "./AddPac";
import DeletePac from "./DeletePac";

const pacsFetcher = async () => {
  const { data, error } = await supabase
    .from("pac")
    .select("*")
    .order("aet_server", { ascending: true });
  if (error) throw error;
  return data;
};

export default function PacsPageContent({
  userRoleId,
}: {
  userRoleId: string;
}) {
  const [isOpenForm, setIsOpenForm] = useState(false);
  const { hasPermission: canManagePacs, isLoading: isLoadingPermission } =
    useCheckPermission(userRoleId, Permissions.MANAGE_PACS);

  const { data: pacs, error, isLoading } = useSWR("admin-pacs", pacsFetcher);
  console.log(pacs);
  if (error) return null;
  if (isLoading || isLoadingPermission) return "loading ...";
  if (!canManagePacs) return null;

  return (
    <>
      <div className="border border-gray-200 rounded-xl bg-white">
        {pacs?.map(({ id, ip, port, aet_client, aet_server }) => (
          <div
            key={id}
            className="relative border-t first:border-t-0 border-gray-200 flex gap-3.5 first:rounded-t-xl items-center justify-between text-left transition-colors duration-300 pl-6 pr-20 py-4"
          >
            <span className="flex gap-3.5 items-center">
              <span>{ip}</span>
              <span className="text-sm text-gray-500">{port}</span>
              <span className="text-sm text-gray-500">{aet_server}</span>
              <span className="text-sm text-gray-500">{aet_client}</span>
            </span>
            <DeletePac pacId={id} />
          </div>
        ))}
        <AddPac />
      </div>
      <PacsQuery userRoleId={userRoleId} />
    </>
  );
}
