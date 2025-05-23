"use client";

import { supabase } from "@/lib/supabase";
import { Icon } from "@iconify/react/dist/iconify.js";
import { ChangeEventHandler } from "react";
import useSWR from "swr";

const fetcher = async (userId: string) => {
  const { data, error } = await supabase
    .from("template")
    .select("id, name, description")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
};

export default function EditUserTemplate({
  handleUserTemplateEdition,
  userId,
  userTemplateId,
}: {
  handleUserTemplateEdition: ChangeEventHandler<HTMLSelectElement>;
  userId: string;
  userTemplateId: string | null;
}) {
  const {
    data: templates,
    error,
    isLoading,
  } = useSWR(`admin_templates_${userId}`, () => fetcher(userId));

  if (error || isLoading) return null;

  return (
    <div className="flex-grow">
      <div className="relative">
        <select
          defaultValue={userTemplateId || ""}
          onChange={handleUserTemplateEdition}
          className="w-50 truncate text-sm px-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500 bg-white"
        >
          <option value="">Select ...</option>
          {templates?.map(({ id, name }) => {
            return (
              <option value={id} key={id}>
                {name}
              </option>
            );
          })}
        </select>
        <div className="absolute top-1/2 -translate-y-1/2 right-1 pr-3 pointer-events-none bg-white">
          <Icon icon="solar:alt-arrow-down-linear" fontSize={16} />
        </div>
      </div>
    </div>
  );
}
