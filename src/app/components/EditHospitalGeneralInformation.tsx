import { HospitalType } from "@/types/HospitalType";
import FieldLabel from "./FieldLabel";
import FieldsSection from "./FieldsSection";
import { DISABLED_INPUT_CLASS, INPUT_CLASS } from "@/constants";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import PrimaryButton from "./PrimaryButton";

export default function EditHospitalGeneralInformation({
  hospital,
  mutateHospital,
}: {
  hospital: HospitalType;
  mutateHospital: () => void;
}) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/hospitals/${hospital.id}`, {
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
      mutateHospital();
      router.push("/admin/hospitals");
    } catch {
      toast.error("Failed to update hospital");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (hospital) setName(hospital.name);
  }, [hospital]);
  return (
    <>
      <FieldsSection>
        <h2 className="font-semibold">General Information</h2>
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
        <div className="grow-1 relative">
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <input
            type="text"
            className={INPUT_CLASS}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        {/* <div>
          <FieldLabel htmlFor="ae_title">AE Title</FieldLabel>
          <span className="ml-2 text-xs text-gray-400 font-normal">(immutable)</span>
          <input
            type="text"
            name="ae_title"
            className={DISABLED_INPUT_CLASS}
            value={hospital.ae_title}
            disabled
            readOnly
          />
        </div> */}
        <div>
          <FieldLabel htmlFor="r2_bucket">
            R2 Folder
            <span className="ml-2 text-xs text-gray-400 font-normal">(immutable)</span>
          </FieldLabel>
          <input
            type="text"
            name="r2_bucket"
            className={DISABLED_INPUT_CLASS}
            value={hospital.r2_bucket}
            disabled
            readOnly
          />
        </div>
      </FieldsSection>
      {/* <AETitleInfo aeTitle={hospital.ae_title} /> */}
      <PrimaryButton
        icon={isSubmitting ? "solar:refresh-linear" : "solar:disk-linear"}
        onClick={handleSave}
        isLoading={isSubmitting || name.trim() === hospital.name}
        label={isSubmitting ? "Saving..." : "Save Changes"}
      ></PrimaryButton>
    </>
  );
}
