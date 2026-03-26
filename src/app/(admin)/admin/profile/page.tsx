import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Icon } from "@iconify/react/dist/iconify.js";
import { format } from "date-fns";
import { ICON_SIZE } from "@/constants";
import NoAccess from "@/components/NoAccess";
import RoleName from "@/components/RoleName";

type ProfileData = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  image_url: string | null;
  created_at: string | null;
  role: { name: string } | null;
};

export default async function Page() {
  const t = await getTranslations("Profile");
  const session = await auth();
  const user = session?.user;

  if (!user) return <NoAccess />;

  const { data: profile } = await supabase
    .from("user")
    .select("first_name, last_name, email, image_url, created_at, role(name)")
    .eq("id", user.id)
    .single<ProfileData>();

  const fullName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : (user?.name ?? "—");

  const createdAt = profile?.created_at ? format(new Date(profile.created_at), "MMM d, yyyy") : "—";

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h1 className="mb-6 font-semibold text-lg block">{t("title")}</h1>
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-gray-200 px-8 py-8 flex items-center gap-6">
          {(profile?.image_url ?? user?.image) ? (
            <Image
              src={profile?.image_url ?? user?.image ?? ""}
              alt={fullName}
              width={72}
              height={72}
              className="rounded-full bg-gray-100 flex-shrink-0"
            />
          ) : (
            <div className="w-[72px] h-[72px] rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Icon icon="solar:user-linear" fontSize={32} className="text-gray-400" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{fullName}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{profile?.email ?? user?.email}</p>
            {profile?.role?.name && (
              <div className="w-fit mt-1.5">
                <RoleName roleName={profile.role.name} />
              </div>
            )}
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          <ProfileField
            icon="solar:user-linear"
            label={t("firstName")}
            value={profile?.first_name ?? "—"}
          />
          <ProfileField
            icon="solar:user-linear"
            label={t("lastName")}
            value={profile?.last_name ?? "—"}
          />
          <ProfileField
            icon="solar:letter-linear"
            label={t("email")}
            value={profile?.email ?? user?.email ?? "—"}
          />
          <ProfileField
            icon="solar:shield-keyhole-linear"
            label={t("role")}
            value={profile?.role?.name ?? "—"}
          />
          <ProfileField icon="solar:calendar-linear" label={t("createdAt")} value={createdAt} />
        </div>
      </div>
    </div>
  );
}

function ProfileField({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="px-8 py-5 flex items-center gap-4">
      <div className="p-2 rounded-lg bg-gray-50 flex-shrink-0">
        <Icon icon={icon} fontSize={ICON_SIZE} className="text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-gray-700 truncate">{value}</p>
      </div>
    </div>
  );
}
