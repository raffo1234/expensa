"use client";

import { Icon } from "@iconify/react";
import { useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import CircularSecondaryButton from "./CircularSecondaryButton";
import DeleteButton from "./DeleteButton";
import { ICON_SIZE } from "@/constants";
import AETitleInfo from "./AETitleInfo";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HospitalAccess {
  id: string;
  hospital_id: string;
  name: string;
  ae_title: string;
  allowed_ip: string | null;
  is_active: boolean;
  created_at: string;
}

type FormState = {
  name: string;
  ae_title: string;
  allowed_ip: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  ae_title: "",
  allowed_ip: "",
  is_active: true,
};

// ─── Fetcher ──────────────────────────────────────────────────────────────────

const fetchAccess = async (hospitalId: string): Promise<HospitalAccess[]> => {
  const { data, error } = await supabase
    .from("hospital_access")
    .select("*")
    .eq("hospital_id", hospitalId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as HospitalAccess[];
};

// ─── Modal ────────────────────────────────────────────────────────────────────

function AccessModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: HospitalAccess | null;
  onClose: () => void;
  onSave: (form: FormState) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          name: initial.name,
          ae_title: initial.ae_title,
          allowed_ip: initial.allowed_ip ?? "",
          is_active: initial.is_active,
        }
      : { ...EMPTY_FORM },
  );
  const [saving, setSaving] = useState(false);

  const set = (key: keyof FormState, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name || !form.ae_title) {
      toast.error("Name and AE Title are required");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">
            {initial ? "Edit Device" : "New Device"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <Icon icon="solar:close-circle-broken" fontSize={ICON_SIZE} className="text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
              Device Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Siemens MAGNETOM — Room 3"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-0 focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500"
            />
          </div>

          {/* AE Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
              AE Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={form.ae_title}
              onChange={(e) => set("ae_title", e.target.value.toUpperCase())}
              placeholder="SCANNER-HOSP1"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono outline-0 focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              The AE title configured on the device. Must be unique.
            </p>
          </div>

          {/* Allowed IP */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
              Allowed IP
              <span className="ml-1.5 text-gray-400 font-normal normal-case">(optional)</span>
            </label>
            <input
              type="text"
              value={form.allowed_ip}
              onChange={(e) => set("allowed_ip", e.target.value)}
              placeholder="192.168.1.50"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono outline-0 focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Restrict connections to this IP only. Leave empty to allow any IP.
            </p>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => set("is_active", !form.is_active)}
              className={`relative w-10 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
                form.is_active ? "bg-cyan-400" : "bg-gray-200"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                  form.is_active ? "translate-x-0" : "-translate-x-4"
                }`}
              />
            </button>
            <span className="text-sm text-gray-600">{form.is_active ? "Active" : "Inactive"}</span>
          </div>

          <AETitleInfo aeTitle={form.ae_title} />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-full hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-sm bg-cyan-400 text-white rounded-full hover:bg-cyan-500 transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
          >
            {saving && (
              <Icon icon="solar:spinner-bold" className="animate-spin" fontSize={ICON_SIZE} />
            )}
            {initial ? "Save changes" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EditHospitalConnectedDevices({ hospitalId }: { hospitalId: string }) {
  const {
    data: access,
    isLoading,
    mutate,
  } = useSWR<HospitalAccess[]>(`${hospitalId}-hospital-access`, () => fetchAccess(hospitalId));

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HospitalAccess | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async (form: FormState) => {
    const { error } = await supabase.from("hospital_access").insert({
      hospital_id: hospitalId,
      name: form.name,
      ae_title: form.ae_title,
      allowed_ip: form.allowed_ip || null,
      is_active: form.is_active,
    });
    if (error) {
      toast.error(error.message);
      throw error;
    }
    toast.success("Device added");
    mutate();
  };

  // ── Update ────────────────────────────────────────────────────────────────
  const handleUpdate = async (form: FormState) => {
    if (!editing) return;
    const { error } = await supabase
      .from("hospital_access")
      .update({
        name: form.name,
        ae_title: form.ae_title,
        allowed_ip: form.allowed_ip || null,
        is_active: form.is_active,
      })
      .eq("id", editing.id);
    if (error) {
      toast.error(error.message);
      throw error;
    }
    toast.success("Device updated");
    mutate();
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("hospital_access").delete().eq("id", id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Device removed");
      mutate();
    } finally {
      setDeletingId(null);
    }
  };

  // ── Toggle active ─────────────────────────────────────────────────────────
  const handleToggleActive = async (device: HospitalAccess) => {
    const { error } = await supabase
      .from("hospital_access")
      .update({ is_active: !device.is_active })
      .eq("id", device.id);
    if (error) {
      toast.error("Failed to update status");
      return;
    }
    mutate();
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm">Connected Devices</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Devices and PACS that can push studies to your SCP
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 bg-cyan-400 hover:bg-cyan-500 text-white text-sm px-4 py-2 rounded-full transition-colors cursor-pointer"
        >
          <Icon icon="solar:add-circle-linear" fontSize={ICON_SIZE} />
          Add Device
        </button>
      </div>

      <div className="bg-white shadow rounded-xl overflow-auto">
        <table className="text-sm w-full table-fixed">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-3 px-3 text-left uppercase text-xs font-semibold text-gray-500">
                Name
              </th>
              <th className="py-3 px-3 text-left uppercase text-xs font-semibold text-gray-500 w-36">
                AE Title
              </th>
              <th className="py-3 px-3 text-left uppercase text-xs font-semibold text-gray-500 w-32">
                Allowed IP
              </th>
              <th className="py-3 px-3 text-center uppercase text-xs font-semibold text-gray-500 w-20">
                Status
              </th>
              <th className="py-3 px-3 w-20" />
            </tr>
          </thead>

          {isLoading && (
            <tbody>
              {Array.from({ length: 3 }, (_, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-gray-50" : ""}>
                  {Array.from({ length: 5 }, (__, j) => (
                    <td key={j} className="py-4 px-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}

          {!isLoading && access?.length === 0 && (
            <tbody>
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400">
                  <Icon icon="solar:scanner-linear" fontSize={36} className="mx-auto mb-3" />
                  <p className="text-sm">No devices connected</p>
                  <p className="text-xs mt-1">Add a scanner or PACS to allow push</p>
                </td>
              </tr>
            </tbody>
          )}

          {!isLoading && access && access.length > 0 && (
            <tbody>
              {access.map((device, index) => (
                <tr
                  key={device.id}
                  className={`border-t border-gray-100 hover:bg-cyan-50/30 transition-colors ${
                    index % 2 === 0 ? "bg-gray-50/50" : "bg-white"
                  }`}
                >
                  <td className="py-4 px-3 font-medium text-gray-700 truncate" title={device.name}>
                    {device.name}
                  </td>
                  <td className="py-4 px-3 font-mono text-xs text-gray-700">{device.ae_title}</td>
                  <td className="py-4 px-3 font-mono text-xs text-gray-500">
                    {device.allowed_ip ?? <span className="text-gray-300">any</span>}
                  </td>
                  <td className="py-4 px-3 text-center">
                    <button
                      onClick={() => handleToggleActive(device)}
                      className="cursor-pointer"
                      title={device.is_active ? "Deactivate" : "Activate"}
                    >
                      <span
                        className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${
                          device.is_active
                            ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}
                      >
                        {device.is_active ? "Active" : "Inactive"}
                      </span>
                    </button>
                  </td>
                  <td className="py-4 px-3">
                    <div className="flex items-center justify-end gap-1">
                      <CircularSecondaryButton
                        onClick={() => {
                          setEditing(device);
                          setModalOpen(true);
                        }}
                        title="Edit"
                      >
                        <Icon icon="solar:pen-linear" width={ICON_SIZE} height={ICON_SIZE} />
                      </CircularSecondaryButton>
                      <DeleteButton
                        onClick={() => handleDelete(device.id)}
                        title="Remove"
                        isDeleting={deletingId === device.id}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>

      {modalOpen && (
        <AccessModal
          initial={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSave={editing ? handleUpdate : handleCreate}
        />
      )}
    </>
  );
}
