import { UserType } from "@/types/userType";
import { ICON_SIZE } from "@/constants";
import { Icon } from "@iconify/react/dist/iconify.js";
import Image from "next/image";
import Link from "next/link";
import { updateUser } from "@/actions/updateUser";
import { formatTimestamp } from "@/utils/formatTimestamp";
import { useRouter } from "next/navigation";
import { preload } from "swr";
import { useEffect } from "react";
import userFetcher from "@/lib/userFetcher";

export default function UserCard({ user, mutate }: { user: UserType; mutate: () => void }) {
  const { first_name, last_name, created_at, email, archived_at, id, role, image_url } = user;
  const router = useRouter();

  const archive = async () => {
    await updateUser(user.id, { archived_at: new Date() });
    mutate();
  };

  const unarchive = async () => {
    await updateUser(user.id, { archived_at: null });
    mutate();
  };

  const href = `/admin/users/edit/${id}`;

  useEffect(() => {
    router.prefetch(href);
    preload(id, userFetcher);
  }, [id, router, href]);

  return (
    <div className="border bg-white border-gray-200 hover:bg-gray-50 rounded-2xl p-4">
      <Image
        src={image_url}
        className="rounded-full mb-3 mx-auto bg-gray-100"
        alt={`${first_name} ${last_name ?? ""}`}
        width={44}
        height={44}
        title={`${first_name} ${last_name ?? ""}`}
      />
      <div
        className="font-semibold w-full mb-1 text-center truncate"
        title={`${first_name} ${last_name ?? ""}`}
      >
        {first_name} {last_name ?? ""}
      </div>
      <div title={email} className="truncate text-xs text-slate-500 mb-3">
        {email}
      </div>
      <div className="text-xs text-cyan-700 px-2 py-0.5 bg-cyan-100 rounded-full w-fit mx-auto mb-4">
        {role?.name}
      </div>
      <p className="text-xs text-center mb-5 text-slate-600">
        Creado: {formatTimestamp(created_at, "short")}
      </p>
      <div className="flex gap-2 items-center justify-center">
        <Link
          type="button"
          href={href}
          className="rounded-full w-11 h-11 border-gray-100 hover:border-gray-200 transition-colors duration-500 border flex items-center justify-center"
        >
          <Icon icon="solar:clapperboard-edit-broken" fontSize={ICON_SIZE} />
        </Link>
        <button
          className="rounded-full w-11 h-11 border-gray-100 hover:border-gray-200 transition-colors duration-500 border flex items-center justify-center"
          title={archived_at ? "Unarchive" : "Archive"}
          type="button"
          onClick={archived_at ? unarchive : archive}
        >
          {archived_at ? (
            <Icon icon="solar:archive-up-minimlistic-linear" fontSize={ICON_SIZE} />
          ) : (
            <Icon icon="solar:archive-down-minimlistic-linear" fontSize={ICON_SIZE} />
          )}
        </button>
        {/* <DeleteUser userId={id} /> */}
      </div>
    </div>
  );
}
