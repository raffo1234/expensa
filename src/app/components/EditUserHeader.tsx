import { supabase } from "@/lib/supabase";
import { UserType } from "@/types/userType";
import { Icon } from "@iconify/react/dist/iconify.js";
import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";
import RoleName from "./RoleName";
import PopoverInnerButton from "./PopoverInnerButton";

const fetcherUser = async (userId: string) => {
  const { data, error } = await supabase
    .from("user")
    .select("id, first_name, last_name")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
};

export default function EditUserHeader({ user }: { user: UserType }) {
  const { data: supervisor, isLoading: isLoadingUser } = useSWR(user.supervisor_user_id, () =>
    user.supervisor_user_id ? fetcherUser(user.supervisor_user_id) : null,
  );

  if (isLoadingUser) return null;

  return (
    <div className="flex gap-4 items-start">
      <Image
        src={user.image_url}
        width={48}
        height={48}
        alt={user.first_name as string}
        className="rounded-full shrink-0"
      />
      <div>
        <h2 className="font-semibold text-lg">
          {user.first_name} {user.last_name}
        </h2>
        {user.role?.name ? (
          <div className="w-fit mb-2">
            <RoleName roleName={user.role?.name} />
          </div>
        ) : null}
        <div className="text-slate-500">
          {supervisor ? (
            <div className="flex gap-2 items-center">
              <span>Assigned to</span>
              <Icon icon="solar:arrow-right-outline" className="inline-block" />
              <Link
                href={`/admin/users/edit/${supervisor.id}`}
                className="text-cyan-500 underline underline-offset-4"
              >
                <PopoverInnerButton title="See">
                  {supervisor?.first_name} {supervisor?.last_name}
                </PopoverInnerButton>
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
