"use client";

import useSWR from "swr";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react/dist/iconify.js";
import NoAccess from "./NoAccess";

interface Hospital {
  id: string;
  name: string;
  ae_title: string;
  is_active: boolean;
  r2_bucket: string;
  created_at: string;
  updated_at: string;
}

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500";

const disabledClass =
  "w-full px-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 text-gray-400 font-mono cursor-not-allowed";

const labelClass = "inline-block mb-2 text-sm font-medium";

const fetcher = async (url: string): Promise<Hospital> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch hospital");
  return res.json();
};

export default function EditHospitalForm({ hospitalId }: { hospitalId: string }) {
  const router = useRouter();
  const {
    data: hospital,
    error,
    isLoading,
    mutate,
  } = useSWR<Hospital>(`/api/hospitals/${hospitalId}`, fetcher);

  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (hospital) setName(hospital.name);
  }, [hospital]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/hospitals/${hospitalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update hospital");
        return;
      }

      toast.success("Hospital updated successfully");
      mutate();
      router.push("/admin/hospitals");
    } catch {
      toast.error("Failed to update hospital");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-xl">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 w-full bg-gray-100 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (error || !hospital) return <NoAccess />;

  return (
    <div className="max-w-xl flex flex-col gap-6">
      {/* Status badge */}
      <div className="flex items-center gap-2">
        <span
          className={`text-xs font-semibold px-3 py-1 rounded-full ${
            hospital.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {hospital.is_active ? "Active" : "Inactive"}
        </span>
        <span className="text-xs text-gray-400">
          Created {new Date(hospital.created_at).toLocaleDateString()}
        </span>
      </div>

      {/* Name — editable */}
      <div>
        <label className={labelClass}>Hospital Name</label>
        <input
          type="text"
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {/* AE Title — immutable */}
      <div>
        <label className={labelClass}>
          AE Title
          <span className="ml-2 text-xs text-gray-400 font-normal">(immutable)</span>
        </label>
        <input type="text" className={disabledClass} value={hospital.ae_title} disabled readOnly />
      </div>

      {/* R2 Bucket — immutable */}
      <div>
        <label className={labelClass}>
          R2 Bucket
          <span className="ml-2 text-xs text-gray-400 font-normal">(immutable)</span>
        </label>
        <input type="text" className={disabledClass} value={hospital.r2_bucket} disabled readOnly />
      </div>

      {/* Connection info */}
      <div className="flex gap-3 bg-cyan-50 border border-cyan-100 rounded-xl px-4 py-3 text-sm text-cyan-700">
        <Icon icon="solar:info-circle-linear" fontSize={18} className="flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">Technician configuration:</p>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            <li>
              IP: <span className="font-mono">dicom.cadia.pe</span>
            </li>
            <li>
              Port: <span className="font-mono">2762</span> (TLS) or{" "}
              <span className="font-mono">104</span>
            </li>
            <li>
              AE Title: <span className="font-mono">{hospital.ae_title}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={isSubmitting || name.trim() === hospital.name}
        className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-white bg-cyan-500 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300 text-sm font-medium w-fit"
      >
        {isSubmitting ? (
          <Icon icon="solar:refresh-linear" fontSize={16} className="animate-spin" />
        ) : (
          <Icon icon="solar:disk-linear" fontSize={16} />
        )}
        {isSubmitting ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
