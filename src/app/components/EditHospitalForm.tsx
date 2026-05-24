"use client";

import useSWR from "swr";
import { useState } from "react";
import NoAccess from "./NoAccess";
import OptionButton from "./OptionButton";
import { HospitalType } from "@/types/HospitalType";
import EditHospitalGeneralInformation from "./EditHospitalGeneralInformation";
import EditHospitalConnectedDevices from "./EditHospitalConnectedDevices";
import EditHospitalWhereToFind from "./EditHospitalWhereToFind";

export enum OPTION {
  TAB_1 = "General",
  TAB_2 = "Connected devices",
  TAB_3 = "Where to find",
}

const fetcher = async (url: string): Promise<HospitalType> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch hospital");
  return res.json();
};

export default function EditHospitalForm({ hospitalId }: { hospitalId: string }) {
  const {
    data: hospital,
    error,
    isLoading,
    mutate: mutateHospital,
  } = useSWR<HospitalType>(`/api/hospitals/${hospitalId}`, fetcher);

  const [option, setOption] = useState(OPTION.TAB_1);

  if (isLoading) {
    return (
      <div className="space-y-7">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 w-full bg-gray-100 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (error || !hospital) return <NoAccess />;

  return (
    <>
      <div className="mb-4 flex gap-2 items-center flex-wrap">
        {Object.values(OPTION).map((value) => {
          return (
            <OptionButton key={value} onClick={() => setOption(value)} isActive={option === value}>
              {value}
            </OptionButton>
          );
        })}
      </div>
      <div className="space-y-7">
        {option === OPTION.TAB_1 ? (
          <EditHospitalGeneralInformation mutateHospital={mutateHospital} hospital={hospital} />
        ) : null}
        {option === OPTION.TAB_2 ? <EditHospitalConnectedDevices hospitalId={hospital.id} /> : null}
        {option === OPTION.TAB_3 ? <EditHospitalWhereToFind hospitalId={hospital.id} /> : null}
      </div>
    </>
  );
}
