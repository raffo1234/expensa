"use client";

import toast from "react-hot-toast";
import useCheckPermission from "@/hooks/useCheckPermission";
import { Permissions } from "@/types/propertyState";
import PacsQuery from "./PacsQuery";
import { supabase } from "@/lib/supabase";
import useSWR, { mutate } from "swr";
import AddPac from "./AddPac";
import DeletePac from "./DeletePac";
import { PacType } from "@/types/PacType";
import { useDebouncedCallback } from "use-debounce";
import { Icon } from "@iconify/react/dist/iconify.js";

const pacsFetcher = async () => {
  const { data, error } = await supabase
    .from("pac")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
};

export default function PacsPageContent({
  userRoleId,
}: {
  userRoleId: string;
}) {
  const { hasPermission: canManagePacs, isLoading: isLoadingPermission } =
    useCheckPermission(userRoleId, Permissions.MANAGE_PACS);

  const { data: pacs, error, isLoading } = useSWR("admin-pacs", pacsFetcher);

  const updatePac = async (id: string, newData: Partial<PacType>) => {
    try {
      await supabase.from("pac").update(newData).eq("id", id);
    } catch (error) {
      console.error(error);
    } finally {
      mutate("admin-pacs");
      toast.success("Report updated successfully!");
    }
  };

  const debouncedUpdate = useDebouncedCallback((id, value) => {
    updatePac(id, value);
  }, 300);

  if (error) return null;
  if (isLoading || isLoadingPermission) return "loading ...";
  if (!canManagePacs) return null;

  return (
    <>
      <div className="border border-gray-200 rounded-xl bg-white">
        {pacs?.map(({ id, ip, port, aet_client, aet_server }) => (
          <>
            <div
              key={id}
              className="relative border-t first:border-t-0 border-gray-200 flex gap-3.5 first:rounded-t-xl items-center justify-between text-left transition-colors duration-300"
            >
              <button
                type="button"
                className="flex-col border-b border-gray-200 w-full items-start gap-1 flex md:flex-row sm:gap-3.5 md:items-center py-4 pl-6 pr-20"
              >
                <Icon
                  icon="solar:alt-arrow-down-linear"
                  fontSize={20}
                  className={`
                    ${true ? "rotate-180" : ""} 
                  transition-transform duration-500 flex-shrink-0`}
                />
                <span>{aet_server}</span>
              </button>
              <DeletePac pacId={id} />
            </div>
            <div className="px-12 py-10">
              <div className="flex-col items-start gap-1 flex md:flex-row sm:gap-3.5 md:items-center">
                <div className="flex gap-3.5 items-center">
                  <input
                    onChange={(event) =>
                      debouncedUpdate(id, { ip: event.target.value })
                    }
                    placeholder="IP"
                    defaultValue={ip}
                    className="w-33 p-2 border border-transparent rounded-xl focus:outline-1 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
                  />
                  <input
                    placeholder="Port"
                    defaultValue={port}
                    className="w-13 text-sm text-gray-500 p-2 border border-transparent rounded-xl focus:outline-1 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
                    onChange={(event) =>
                      debouncedUpdate(id, { port: event.target.value })
                    }
                  />
                </div>
                <input
                  placeholder="AET Server"
                  defaultValue={aet_server}
                  onChange={(event) =>
                    debouncedUpdate(id, { aet_server: event.target.value })
                  }
                  className="text-sm  text-gray-500 p-2 border border-transparent rounded-xl focus:outline-1 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
                />
                <input
                  onChange={(event) =>
                    debouncedUpdate(id, { aet_client: event.target.value })
                  }
                  placeholder="AET Client, Optional..."
                  defaultValue={aet_client}
                  className="text-sm  text-gray-500 p-2 border border-transparent rounded-xl focus:outline-1 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
                />
              </div>
            </div>
          </>
        ))}
        <AddPac />
      </div>
      <PacsQuery userRoleId={userRoleId} />
    </>
  );
}
