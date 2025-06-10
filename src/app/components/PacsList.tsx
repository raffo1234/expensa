"use client";

import { Permissions } from "@/types/propertyState";
import useCheckPermission from "@/hooks/useCheckPermission";
import { PacType } from "@/types/PacType";
import { supabase } from "@/lib/supabase";
import useSWR from "swr";
import Link from "next/link";
import { Icon } from "@iconify/react/dist/iconify.js";

const pacsFetcher = async () => {
  const { data, error } = await supabase
    .from("pac")
    .select("*")
    .eq("is_verified", true);

  if (error) throw error;
  return data;
};

export default function PacsList({
  setActivePac,
  activePac,
  userRoleId,
  userId,
}: {
  setActivePac: React.Dispatch<React.SetStateAction<PacType | null>>;
  activePac: PacType | null;
  userRoleId: string;
  userId: string | undefined;
}) {
  const { hasPermission: canManagePacs, isLoading: isLoading } =
    useCheckPermission(userRoleId, Permissions.MANAGE_PACS);

  const {
    data: pacs,
    error: errorPacs,
    isLoading: isLoadingPacs,
  } = useSWR(`admin-permissions-${userId}`, pacsFetcher);

  const handlePacActive = (newPac: PacType) => {
    setActivePac(newPac);
    localStorage.setItem("pacActiveId", newPac.id);
  };

  if (errorPacs) return null;

  if (isLoadingPacs || isLoading) return "loading...";

  if (!userId || !pacs) return null;

  return (
    <div
      className="grid gap-2 mb-6 flex-grow-1"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
      }}
    >
      {canManagePacs ? (
        <>
          {pacs.map((pac) => {
            const { id, aet_server } = pac;
            return (
              <button
                key={id}
                type="button"
                title={aet_server}
                onClick={() => handlePacActive(pac)}
                className={`
                          ${
                            id === activePac?.id
                              ? "bg-rose-50 border-rose-200"
                              : "bg-gray-50 border-gray-200"
                          } 
                        cursor-pointer truncate text-center p-3 rounded-xl border`}
              >
                {aet_server}
              </button>
            );
          })}
          <Link
            target="_blank"
            title="Pacs Settings"
            href="/admin/pacs/settings"
            className="p-3 border border-gray-200 rounded-xl w-fit hover:border-cyan-200 hover:text-cyan-400 transition-colors duration-300"
          >
            <Icon icon="solar:settings-linear" fontSize={24} />
          </Link>
        </>
      ) : null}
    </div>
  );
}
