import { supabase } from "@/lib/supabase";
import EditTemplate from "@/components/EditTemplate";
import { Suspense } from "react";
import FormSkeleton from "@/components/FormSkeleton";

type Params = Promise<{ id: string }>;

export default async function Page({ params }: { params: Params }) {
  const { id } = await params;
  if (!id) return null;

  const { data: template } = await supabase
    .from("template")
    .select("*")
    .eq("id", id)
    .single();

  return (
    <Suspense fallback={<FormSkeleton rows={2} />}>
      <EditTemplate id={id} fallbackTemplate={template ?? undefined} />
    </Suspense>
  );
}