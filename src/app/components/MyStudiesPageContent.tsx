"use client";

import { supabase } from "@/lib/supabase";
import useSWR from "swr";
import MyStudy from "./MyStudy";

async function fetcher(userId: string) {
  const { data, error } = await supabase
    .from("dicom")
    .select(
      "id, state, patient_id, created_at, patient_name, study_date, study_description"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export default function MyStudiesPageContent({ userId }: { userId: string }) {
  const { data: dicoms, isLoading } = useSWR(`admin-my-stydies-${userId}`, () =>
    fetcher(userId)
  );

  if (isLoading || !dicoms) return null;

  return (
    <>
      <h1 className="mb-6 font-semibold text-lg block">
        ({dicoms.length}) My Studies
      </h1>
      {dicoms.map((dicom) => {
        return <MyStudy key={dicom.id} dicom={dicom} userId={userId} />;
      })}
    </>
  );
}
