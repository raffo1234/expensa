"use client";

import { Permissions } from "@/types/propertyState";
import useCheckPermission from "@/hooks/useCheckPermission";
import { PacType } from "@/types/PacType";
import { supabase } from "@/lib/supabase";
import useSWR from "swr";
import PacsSettings from "./PacsSettings";
import OptionButton from "./OptionButton";

const pacsFetcher = async (userId: string) => {
  const { data, error } = await supabase
    .from("pac")
    .select("*")
    .eq("user_id", userId)
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
  userId: string;
}) {
  const { hasPermission: canManagePacs, isLoading: isLoading } =
    useCheckPermission(userRoleId, Permissions.MANAGE_PACS);

  const {
    data: pacs,
    error: errorPacs,
    isLoading: isLoadingPacs,
  } = useSWR(`admin-permissions-${userId}`, () => pacsFetcher(userId));

  const handlePacActive = (newPac: PacType) => {
    setActivePac(newPac);
    localStorage.setItem("pacActiveId", newPac.id);
  };

  if (errorPacs) return null;

  if (isLoadingPacs || isLoading) return "loading...";

  if (!userId || !pacs) return null;

  return (
    <div
      className="grid gap-2 mb-4 flex-grow-1"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
      }}
    >
      {canManagePacs ? (
        <>
          {pacs.map((pac) => {
            const { id, aet_server } = pac;
            const isActive = id === activePac?.id;

            return (
              <OptionButton
                key={id}
                onClick={() => handlePacActive(pac)}
                isActive={isActive}
                title={aet_server}
              >
                {aet_server}
              </OptionButton>
            );
          })}
          <PacsSettings userId={userId} userRoleId={userRoleId} />
        </>
      ) : null}
    </div>
  );
}
