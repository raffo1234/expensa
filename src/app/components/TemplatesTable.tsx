"use client";

import { supabase } from "@/lib/supabase";
import useSWR from "swr";
import TemplatesTableItem from "./TemplateTableItem";
import FallbackTemplatesList from "./FallbackTemplatesList";

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
      <FallbackTemplatesList />
    );

  return templates?.map(({ id, name }) => (
    <TemplatesTableItem key={id} userId={userId} id={id} name={name} />
  ));
}
