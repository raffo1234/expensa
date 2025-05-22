"use client";

import { supabase } from "@/lib/supabase";
import useSWR from "swr";
import TemplatesTableItem from "./TemplateTableItem";

const fetcher = async (userId: string) => {
  const { data, error } = await supabase
    .from("template")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
};

export default function TemplatesTable({ userId }: { userId: string }) {
  const {
    data: templates,
    error,
    isLoading,
  } = useSWR(`admin_templates_${userId}`, () => fetcher(userId));

  if (error) return null;

  if (isLoading)
    return (
      <>
        <div className="px-6  transition-all duration-300 py-4 border-t  border-gray-200 first:border-0">
          <div className="rounded-xl bg-gray-100 h-4 w-1/2"></div>
        </div>
        <div className="px-6  transition-all duration-300 py-4 border-t  border-gray-200 first:border-0">
          <div className="rounded-xl bg-gray-100 h-4 w-1/2"></div>
        </div>
        <div className="px-6  transition-all duration-300 py-4 border-t  border-gray-200 first:border-0">
          <div className="rounded-xl bg-gray-100 h-4 w-1/2"></div>
        </div>
      </>
    );

  return templates?.map(({ id, name }) => (
    <TemplatesTableItem key={id} userId={userId} id={id} name={name} />
  ));
}
