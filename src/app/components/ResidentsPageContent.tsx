"use client";

import { supabase } from "@/lib/supabase";
import { UserType } from "@/types/userType";
import useSWR from "swr";
import Image from "next/image";
import useCheckPermission from "@/hooks/useCheckPermission";
import { Permissions } from "@/types/propertyState";
import FallbackPermission from "./FallbackPermission";
import Link from "next/link";
import { Icon } from "@iconify/react/dist/iconify.js";
import { ICON_SIZE } from "@/constants";

const fetcher = async (userId: string) => {
  const { data } = (await supabase
    .from("user")
    .select(
      `
        *,
        role (
          id,
          name
        ),
        template: user_template_id_fkey (
          id,
          name
        ),
        residents: user (
          id,
          first_name,
          last_name,
          role(id, name),
          image_url
        )
      `
    )
    .eq("id", userId)
    .single()) as { data: UserType | null };

  return data;
};

export default function ResidentsPageContent({
  userId,
  userRoleId,
}: {
  userId: string;
  userRoleId: string;
}) {
  const { data, isLoading } = useSWR("admin-residents", () => fetcher(userId));
  const residents = data?.residents;

  const { hasPermission: canViewResidents } = useCheckPermission(
    userRoleId,
    Permissions.VIEW_RESIDENTS
  );

  if (isLoading) return null;

  if (!canViewResidents) return <FallbackPermission />;

  return (
    <>
      {data?.residents?.length === 0 ? (
        <span className="text-sm text-gray-500">No residents assigned</span>
      ) : (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
          }}
        >
          {residents?.map(
            ({ first_name, last_name, id, role_id, role, image_url }) => {
              return (
                <div
                  key={id}
                  className="border bg-white border-gray-200 hover:bg-gray-50 rounded-2xl p-4"
                >
                  <Image
                    src={image_url}
                    className="rounded-full mb-3 mx-auto bg-gray-100"
                    alt={first_name || id}
                    width={44}
                    height={44}
                    title={first_name}
                  />
                  <div
                    className="font-semibold w-full mb-1 text-center truncate"
                    title={first_name}
                  >
                    {first_name} {last_name}
                  </div>
                  <div className="text-sm text-gray-500 w-full text-center mb-4">
                    {role?.name}
                  </div>
                  <div className="flex gap-2 items-center justify-center">
                    {role_id ? (
                      <Link
                        type="button"
                        href={`/admin/users/edit/${id}`}
                        className="rounded-full w-11 h-11 border-gray-100 hover:border-gray-200 transition-colors duration-500 border flex items-center justify-center"
                      >
                        <Icon
                          icon="solar:clapperboard-edit-broken"
                          fontSize={ICON_SIZE}
                        />
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </>
  );
}
