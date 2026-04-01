"use client";

import useSWR from "swr";
import { Icon } from "@iconify/react/dist/iconify.js";
import toast from "react-hot-toast";
import CircularSecondaryButton from "./CircularSecondaryButton";

interface Hospital {
  id: string;
  name: string;
  ae_title: string;
  is_active: boolean;
  r2_bucket: string;
  created_at: string;
}

const fetcher = async (): Promise<Hospital[]> => {
  const res = await fetch("/api/hospitals");
  if (!res.ok) throw new Error("Failed to fetch hospitals");
  return res.json();
};

export default function HospitalsTable() {
  const { data, error, isLoading, mutate } = useSWR<Hospital[]>("/api/hospitals", fetcher);

  const toggleActive = async (hospital: Hospital) => {
    const action = hospital.is_active ? "deactivate" : "activate";
    const confirmed = confirm(
      `Are you sure you want to ${action} ${hospital.name}?\n\n${
        hospital.is_active
          ? "The SCP will immediately reject connections from this hospital's AE title."
          : "The SCP will accept connections from this hospital's AE title again."
      }`,
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/hospitals/${hospital.id}`, {
        method: hospital.is_active ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        ...(!hospital.is_active && {
          body: JSON.stringify({ is_active: true }),
        }),
      });

      if (!res.ok) throw new Error();
      toast.success(`Hospital ${action}d successfully`);
      mutate();
    } catch {
      toast.error(`Failed to ${action} hospital`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 w-full bg-gray-100 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm px-4 py-2 border border-rose-200 flex items-center gap-3 bg-rose-50 rounded-xl text-rose-700">
        <Icon icon="solar:close-circle-broken" className="flex-shrink-0" fontSize={20} />
        Error fetching hospitals
      </p>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <Icon
          icon="streamline-ultimate:medical-hospital-1"
          fontSize={48}
          className="mx-auto mb-4"
        />
        <p className="text-base font-semibold text-gray-600 mb-1">No hospitals yet</p>
        <p className="text-sm">Add your first hospital to start receiving DICOM studies.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-xl overflow-auto">
      <table className="text-sm w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left uppercase text-xs font-semibold py-4 px-4">Name</th>
            <th className="text-left uppercase text-xs font-semibold py-4 px-4">AE Title</th>
            <th className="text-left uppercase text-xs font-semibold py-4 px-4">R2 Bucket</th>
            <th className="text-left uppercase text-xs font-semibold py-4 px-4">Status</th>
            <th className="text-left uppercase text-xs font-semibold py-4 px-4">Created</th>
            <th className="w-32" />
          </tr>
        </thead>
        <tbody>
          {data.map((hospital, index) => (
            <tr
              key={hospital.id}
              className={[
                index !== 0 ? "border-t border-gray-200" : "",
                !hospital.is_active ? "opacity-50" : "",
              ].join(" ")}
            >
              <td className="py-4 px-4">{hospital.name}</td>
              <td className="py-4 px-4">
                <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                  {hospital.ae_title}
                </span>
              </td>
              <td className="py-4 px-4">
                <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                  {hospital.r2_bucket}
                </span>
              </td>
              <td className="py-4 px-4">
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    hospital.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {hospital.is_active ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="py-4 px-4 text-gray-400 text-xs">
                {new Date(hospital.created_at).toLocaleDateString()}
              </td>
              <td className="py-4 px-4">
                <div className="flex gap-2 justify-end">
                  <CircularSecondaryButton href={`/admin/hospitals/${hospital.id}`} title="Edit">
                    <Icon icon="solar:pen-linear" fontSize={16} />
                  </CircularSecondaryButton>
                  <CircularSecondaryButton
                    onClick={() => toggleActive(hospital)}
                    className={` ${
                      hospital.is_active
                        ? "hover:bg-rose-50 text-rose-400"
                        : "hover:bg-green-50 text-green-500"
                    }`}
                    title={hospital.is_active ? "Deactivate" : "Activate"}
                  >
                    <Icon
                      icon={
                        hospital.is_active
                          ? "solar:close-circle-linear"
                          : "solar:check-circle-linear"
                      }
                      fontSize={16}
                    />
                  </CircularSecondaryButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
