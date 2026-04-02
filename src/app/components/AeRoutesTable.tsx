"use client";

import { AeRouteType } from "@/types/aeRouteType";
import { Icon } from "@iconify/react";
import { useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";

const ICON_SIZE = 16;

// ─── Types ────────────────────────────────────────────────────────────────────

type HospitalOption = { id: string; name: string; ae_title: string };

type FormState = {
  hospital_id: string;
  ae_title: string;
  host: string;
  port: number;
  description: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  hospital_id: "",
  ae_title: "",
  host: "",
  port: 104,
  description: "",
  is_active: true,
};

// ─── Fetchers ─────────────────────────────────────────────────────────────────

const fetchRoutes = async (): Promise<AeRouteType[]> => {
  const res = await fetch("/api/ae-routes");
  if (!res.ok) throw new Error("Failed to fetch ae_routes");
  return res.json();
};

const fetchHospitals = async (): Promise<HospitalOption[]> => {
  const { data, error } = await supabase
    .from("hospital")
    .select("id, name, ae_title")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as HospitalOption[];
};

// ─── Modal ────────────────────────────────────────────────────────────────────

function RouteModal({
  hospitals,
  initial,
  onClose,
  onSave,
}: {
  hospitals: HospitalOption[];
  initial?: AeRouteType | null;
  onClose: () => void;
  onSave: (form: FormState) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          hospital_id: initial.hospital_id,
          ae_title: initial.ae_title,
          host: initial.host,
          port: initial.port,
          description: initial.description ?? "",
          is_active: initial.is_active,
        }
      : { ...EMPTY_FORM, hospital_id: hospitals[0]?.id ?? "" },
  );
  const [saving, setSaving] = useState(false);

  const set = (key: keyof FormState, value: string | number | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.hospital_id || !form.ae_title || !form.host || !form.port) {
      toast.error("Complete all required fields");
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
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">
            {initial ? "Edit AE Route" : "New AE Route"}
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
          {/* Hospital */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
              Hospital <span className="text-rose-400">*</span>
            </label>
            <select
              value={form.hospital_id}
              onChange={(e) => set("hospital_id", e.target.value)}
              disabled={!!initial}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-0 focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-400"
            >
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
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
              placeholder="PACS-HOSP"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono outline-0 focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500"
            />
          </div>

          {/* Host + Port */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                Host / IP <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={form.host}
                onChange={(e) => set("host", e.target.value)}
                placeholder="192.168.1.10"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono outline-0 focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500"
              />
            </div>
            <div className="w-24">
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
                Port <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                value={form.port}
                onChange={(e) => set("port", parseInt(e.target.value) || 104)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono outline-0 focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Philips PACS — Radiology dept"
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-0 focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500"
            />
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
                  form.is_active ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm text-gray-600">
              {form.is_active ? "Active" : "Inactive"}
            </span>
          </div>
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
            {saving && <Icon icon="solar:spinner-bold" className="animate-spin" fontSize={14} />}
            {initial ? "Save changes" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AeRoutesTable() {
  const { data: routes, isLoading, mutate } = useSWR<AeRouteType[]>("ae-routes", fetchRoutes);
  const { data: hospitals } = useSWR<HospitalOption[]>("hospitals-list", fetchHospitals);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AeRouteType | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hospitalFilter, setHospitalFilter] = useState<string>("");

  const filtered = (routes ?? []).filter((r) =>
    hospitalFilter ? r.hospital_id === hospitalFilter : true,
  );

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async (form: FormState) => {
    const res = await fetch("/api/ae-routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.message ?? "Failed to create");
      throw new Error(err.message);
    }
    toast.success("AE Route created");
    mutate();
  };

  // ── Update ────────────────────────────────────────────────────────────────
  const handleUpdate = async (form: FormState) => {
    if (!editing) return;
    const res = await fetch(`/api/ae-routes/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.message ?? "Failed to update");
      throw new Error(err.message);
    }
    toast.success("AE Route updated");
    mutate();
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/ae-routes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.message ?? "Failed to delete");
        return;
      }
      toast.success("AE Route deleted");
      mutate();
    } finally {
      setDeletingId(null);
    }
  };

  // ── Toggle active ─────────────────────────────────────────────────────────
  const handleToggleActive = async (route: AeRouteType) => {
    const res = await fetch(`/api/ae-routes/${route.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...route, is_active: !route.is_active }),
    });
    if (!res.ok) {
      toast.error("Failed to update status");
      return;
    }
    mutate();
  };

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4 items-start sm:items-center justify-between">
        <select
          value={hospitalFilter}
          onChange={(e) => setHospitalFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm outline-0 focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 cursor-pointer"
        >
          <option value="">All hospitals</option>
          {(hospitals ?? []).map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>

        <button
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="flex items-center gap-2 bg-cyan-400 hover:bg-cyan-500 text-white text-sm px-4 py-2 rounded-full transition-colors cursor-pointer"
        >
          <Icon icon="solar:add-circle-linear" fontSize={ICON_SIZE} />
          New AE Route
        </button>
      </div>

      {/* ── Table ── */}
      <div className="bg-white shadow rounded-xl overflow-auto">
        <table className="text-sm w-full table-fixed">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-3 px-3 text-left uppercase text-xs font-semibold text-gray-500 w-36">Hospital</th>
              <th className="py-3 px-3 text-left uppercase text-xs font-semibold text-gray-500 w-32">AE Title</th>
              <th className="py-3 px-3 text-left uppercase text-xs font-semibold text-gray-500 w-36">Host</th>
              <th className="py-3 px-3 text-left uppercase text-xs font-semibold text-gray-500 w-16">Port</th>
              <th className="py-3 px-3 text-left uppercase text-xs font-semibold text-gray-500">Description</th>
              <th className="py-3 px-3 text-center uppercase text-xs font-semibold text-gray-500 w-20">Status</th>
              <th className="py-3 px-3 w-20"></th>
            </tr>
          </thead>

          {/* Skeleton */}
          {isLoading && (
            <tbody>
              {Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-gray-50" : ""}>
                  {Array.from({ length: 7 }, (__, j) => (
                    <td key={j} className="py-4 px-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}

          {/* Empty */}
          {!isLoading && filtered.length === 0 && (
            <tbody>
              <tr>
                <td colSpan={7} className="text-center py-16 text-gray-400">
                  <Icon icon="solar:server-minimalistic-linear" fontSize={40} className="mx-auto mb-3" />
                  <p className="text-sm">No AE routes found</p>
                  <p className="text-xs mt-1">Add a PACS connection to get started</p>
                </td>
              </tr>
            </tbody>
          )}

          {/* Rows */}
          {!isLoading && filtered.length > 0 && (
            <tbody>
              {filtered.map((route, index) => (
                <tr
                  key={route.id}
                  className={`border-t border-gray-100 hover:bg-cyan-50/30 transition-colors ${
                    index % 2 === 0 ? "bg-gray-50/50" : "bg-white"
                  }`}
                >
                  <td className="py-4 px-3 truncate font-medium text-gray-700" title={route.hospital?.name}>
                    {route.hospital?.name ?? "—"}
                  </td>
                  <td className="py-4 px-3 font-mono text-xs text-gray-700">
                    {route.ae_title}
                  </td>
                  <td className="py-4 px-3 font-mono text-xs text-gray-600 truncate">
                    {route.host}
                  </td>
                  <td className="py-4 px-3 font-mono text-xs text-gray-600">
                    {route.port}
                  </td>
                  <td className="py-4 px-3 text-gray-500 truncate text-xs" title={route.description ?? ""}>
                    {route.description ?? "—"}
                  </td>
                  <td className="py-4 px-3 text-center">
                    <button
                      onClick={() => handleToggleActive(route)}
                      className="cursor-pointer"
                      title={route.is_active ? "Deactivate" : "Activate"}
                    >
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${
                        route.is_active
                          ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }`}>
                        {route.is_active ? "Active" : "Inactive"}
                      </span>
                    </button>
                  </td>
                  <td className="py-4 px-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditing(route); setModalOpen(true); }}
                        title="Edit"
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer text-gray-400 hover:text-gray-600"
                      >
                        <Icon icon="solar:pen-linear" fontSize={ICON_SIZE} />
                      </button>
                      <button
                        onClick={() => handleDelete(route.id)}
                        disabled={deletingId === route.id}
                        title="Delete"
                        className="p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer text-gray-400 hover:text-rose-500 disabled:opacity-40"
                      >
                        {deletingId === route.id
                          ? <Icon icon="solar:spinner-bold" className="animate-spin" fontSize={ICON_SIZE} />
                          : <Icon icon="solar:trash-bin-minimalistic-linear" fontSize={ICON_SIZE} />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>

      {/* ── Modal ── */}
      {modalOpen && (
        <RouteModal
          hospitals={hospitals ?? []}
          initial={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSave={editing ? handleUpdate : handleCreate}
        />
      )}
    </>
  );
}
