"use client";

import { DicomStateEnum } from "@/enums/dicomStateEnum";
import formatDate from "@/lib/formatDate";
import { supabase } from "@/lib/supabase";
import useSWR from "swr";

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
    <div className="">
      <h1 className="mb-6 font-semibold text-lg block">My Studies</h1>
      {dicoms.map(
        ({
          id,
          state,
          patient_id,
          patient_name,
          study_description,
          study_date,
        }) => {
          return (
            <div className="bg-white rounded-lg shadow-xs p-6 mb-2" key={id}>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-sm mb-2 text-gray-400">
                    ID: {patient_id}
                  </h2>
                  <div className="font-semibold mb-2 text-sm">
                    {patient_name}
                  </div>
                  <div className="text-xs text-gray-400 mb-2">
                    {study_description}
                  </div>
                  <div className="font-semibold text-sm">
                    Study Date: {formatDate(study_date)}
                  </div>
                </div>
                <div
                  className={`
                              font-semibold uppercase
                              ${
                                state === ""
                                  ? " border-gray-100 bg-gray-50"
                                  : ""
                              } 
                              ${
                                state === DicomStateEnum.VIEWED
                                  ? "text-yellow-500 border-yellow-300 bg-yellow-50"
                                  : ""
                              }  
                              ${
                                state === DicomStateEnum.DRAFT
                                  ? "text-orange-500 border-orange-100 bg-orange-50"
                                  : ""
                              }  
                              ${
                                state === DicomStateEnum.COMPLETED
                                  ? "text-cyan-600 border-cyan-200 bg-cyan-100"
                                  : ""
                              }  
                              py-1 px-5 text-xs mb-6 uppercase w-fit rounded-xl border`}
                  title={state}
                >
                  {state === "" ? "Send" : state}
                </div>
              </div>
            </div>
          );
        }
      )}
    </div>
  );
}
