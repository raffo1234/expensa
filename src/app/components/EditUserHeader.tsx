import { supabase } from "@/lib/supabase";
import { UserType } from "@/types/userType";
import { Icon } from "@iconify/react/dist/iconify.js";
import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";

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
  const { data: supervisor, isLoading: isLoadingUser } = useSWR(
    user.supervisor_user_id,
    () =>
      user.supervisor_user_id ? fetcherUser(user.supervisor_user_id) : null
  );

  if (isLoadingUser) return null;

  return (
    <h2 className="flex gap-4 items-center font-semibold text-lg">
      <Image
        src={user.image_url}
        width={48}
        height={48}
        alt={user.first_name as string}
        className="rounded-full"
      />
      <span>
        {user.first_name} {user.last_name}
        <span className="text-sm block text-gray-500 font-normal">
          {user.role?.name}{" "}
          {supervisor ? (
            <>
              <Icon icon="solar:arrow-right-outline" className="inline-block" />
              <Link
                target="_blank"
                href={`/admin/users/edit/${supervisor.id}`}
                className="text-gray-800 border-b border-gray-800"
              >
                {supervisor?.first_name} {supervisor?.last_name}
              </Link>
            </>
          ) : null}
        </span>
      </span>
    </h2>
  );
}
