"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import FieldsSection from "./FieldsSection";
import PrimaryButton from "./PrimaryButton";
import { DISABLED_INPUT_CLASS } from "@/constants";

const inputClass =
  "w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 font-mono";

const labelClass = "inline-block mb-2 text-sm font-medium";

// Auto-generate AE title and bucket name from hospital name
// const toAeTitle = (name: string) =>
//   `CADIA-${name
//     .toUpperCase()
//     .replace(/[^A-Z0-9]/g, "-")
//     .replace(/-+/g, "-")
//     .slice(0, 9)}`;

const toBucketName = (name: string) =>
  `cadia-${name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 45)}`;

export default function CreateHospitalForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    r2_bucket: "",
  });

  const handleNameChange = (value: string) => {
    setForm({
      name: value,
      r2_bucket: toBucketName(value),
    });
  };

  const handleSubmit = async () => {
    if (!form.name || !form.r2_bucket) {
      toast.error("All fields are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/hospitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create hospital");
        return;
      }

      toast.success("Hospital created successfully");
      router.push("/admin/hospitals");
    } catch {
      toast.error("Failed to create hospital");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <FieldsSection>
        <div>
          <label className={labelClass}>Hospital Name</label>
          <input
            type="text"
            className={inputClass.replace("font-mono", "")}
            placeholder="e.g. Hospital Nacional Dos de Mayo"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">
            AE title and bucket name are auto-generated from the name.
          </p>
        </div>
        {/* <div>
          <label className={labelClass}>
            AE Title
            <span className="ml-2 text-xs text-gray-400 font-normal">
              (1-16 chars, uppercase, immutable after creation)
            </span>
          </label>
          <input
            type="text"
            className={inputClass}
            placeholder="e.g. CADIA-HOSP-001"
            value={form.ae_title}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                ae_title: e.target.value.toUpperCase().slice(0, 16),
              }))
            }
          />
          <p className="text-xs text-gray-400 mt-1">
            This is what the hospital technician configures on the scanner. Cannot be changed after
            creation.
          </p>
        </div> */}
        <div>
          <label className={labelClass}>
            R2 Bucket
            <span className="ml-2 text-xs text-gray-400 font-normal">
              (lowercase, immutable after creation)
            </span>
          </label>
          <input
            type="text"
            className={DISABLED_INPUT_CLASS}
            placeholder="e.g. cadia-hospital-dos-de-mayo"
            value={form.r2_bucket}
            disabled
            readOnly
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                r2_bucket: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
              }))
            }
          />
          <p className="text-xs text-gray-400 mt-1">
            A dedicated R2 bucket will be created automatically. Cannot be changed after creation.
          </p>
        </div>
        {/* <div className="flex gap-3 bg-cyan-50 border border-cyan-100 rounded-xl px-4 py-3 text-sm text-cyan-700">
          <Icon icon="solar:info-circle-linear" fontSize={18} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">After creation, share with the technician:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>
                IP: <span className="font-mono">dicom.cadia.pe</span>
              </li>
              <li>
                Port: <span className="font-mono">2762</span> (TLS) or{" "}
                <span className="font-mono">104</span>
              </li>
              <li>
                AE Title: <span className="font-mono">{form.ae_title || "—"}</span>
              </li>
            </ul>
          </div>
        </div> */}
      </FieldsSection>
      <PrimaryButton
        type="submit"
        label={isSubmitting ? "Creating..." : "Create Hospital"}
        onClick={handleSubmit}
        // disabled={isSubmitting || !form.name}
        isLoading={isSubmitting}
      />
    </div>
  );
}
