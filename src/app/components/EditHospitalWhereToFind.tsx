"use client";

import { AeRouteType } from "@/types/aeRouteType";
import { Icon } from "@iconify/react";
import { startTransition, useEffect, useOptimistic, useState } from "react";
import useSWR from "swr";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import CircularSecondaryButton from "./CircularSecondaryButton";
import DeleteButton from "./DeleteButton";
import { ICON_SIZE, INPUT_CLASS } from "@/constants";
import PopoverInnerButton from "./PopoverInnerButton";
import FormLabel from "./FormLabel";
import CloseIcon from "./CloseIcon";
import PrimaryButton from "./PrimaryButton";
import SecondaryButton from "./SecondaryButton";

// ─── Types ────────────────────────────────────────────────────────────────────

type HospitalOption = { id: string; name: string };

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

const fetchRoutes = async (hospitalId: string): Promise<AeRouteType[]> => {
  const { data, error } = await supabase
    .from("ae_route")
    .select("*, hospital:hospital_id (id, name)")
    .eq("hospital_id", hospitalId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AeRouteType[];
};

const fetchHospitals = async (): Promise<HospitalOption[]> => {
  const { data, error } = await supabase
    .from("hospital")
    .select("id, name")
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
  const [mounted, setMounted] = useState(false);
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
  const [aeError, setAeError] = useState<string | null>(null);
  const [aeChecking, setAeChecking] = useState(false);

  const set = (key: keyof FormState, value: string | number | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  // ── AE Title uniqueness check ──────────────────────────────────────────────
  const checkAeTitle = async (value: string) => {
    if (!value) return;
    setAeChecking(true);
    setAeError(null);
    try {
      let query = supabase.from("ae_route").select("id").eq("ae_title", value).limit(1);

      if (initial?.id) {
        // Allow saving without changing the ae_title on edit
        query = query.neq("id", initial.id);
      }

      const { data } = await query;
      if (data && data.length > 0) {
        setAeError("This AE Title is already in use");
      }
    } finally {
      setAeChecking(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.hospital_id || !form.ae_title || !form.host || !form.port) {
      toast.error("Complete all required fields");
      return;
    }
    if (aeError || aeChecking) {
      toast.error("Fix AE Title before saving");
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

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        mounted ? "bg-[rgb(255,255,255,.9)] visible" : "bg-white/0 invisible"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden transition-all duration-300 ${
          mounted ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-80"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">
            {initial ? "Edit AE Route" : "New AE Route"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Hospital */}
          <div>
            <FormLabel>
              Hospital <span className="text-rose-400">*</span>
            </FormLabel>
            <select
              value={form.hospital_id}
              onChange={(e) => set("hospital_id", e.target.value)}
              disabled
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-0 focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 disabled:bg-gray-50 disabled:text-gray-400"
            >
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          {/* AE Title */}
          <div>
            <FormLabel>
              AE Title <span className="text-rose-400">*</span>
            </FormLabel>
            <div className="relative">
              <input
                type="text"
                value={form.ae_title}
                onChange={(e) => {
                  set("ae_title", e.target.value.toUpperCase());
                  setAeError(null); // clear error while typing
                }}
                onBlur={() => checkAeTitle(form.ae_title)}
                placeholder="PACS-HOSP"
                className={`${INPUT_CLASS} ${
                  aeError
                    ? "border-rose-400 focus:ring-rose-100 focus:border-rose-500"
                    : "border-gray-200 focus:ring-cyan-100 focus:border-cyan-500"
                }`}
              />
              {aeChecking && (
                <Icon
                  icon="solar:spinner-bold"
                  className="animate-spin absolute right-3 top-2.5 text-gray-400"
                  fontSize={16}
                />
              )}
            </div>
            {aeError && (
              <p className="mt-1 text-xs text-rose-500 flex items-center gap-1">
                <Icon icon="solar:danger-circle-linear" fontSize={14} />
                {aeError}
              </p>
            )}
          </div>

          {/* Host + Port */}
          <div className="flex gap-3">
            <div className="flex-1">
              <FormLabel>
                Host / IP <span className="text-rose-400">*</span>
              </FormLabel>
              <input
                type="text"
                value={form.host}
                onChange={(e) => set("host", e.target.value)}
                placeholder="192.168.1.10"
                className={INPUT_CLASS}
              />
            </div>
            <div className="w-24">
              <FormLabel>
                Port <span className="text-rose-400">*</span>
              </FormLabel>
              <input
                type="number"
                value={form.port}
                onChange={(e) => set("port", parseInt(e.target.value) || 104)}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <FormLabel>Description</FormLabel>
            <input
              type="text"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Philips PACS — Radiology dept"
              className={INPUT_CLASS}
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
                  form.is_active ? "translate-x-0" : "-translate-x-4"
                }`}
              />
            </button>
            <span className="text-sm text-gray-600">{form.is_active ? "Active" : "Inactive"}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <SecondaryButton onClick={onClose} label="Cancel" />
          <PrimaryButton
            label={initial ? "Save changes" : "Create"}
            onClick={handleSubmit}
            isLoading={saving || aeChecking || !!aeError}
          ></PrimaryButton>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EditHospitalWhereToFind({ hospitalId }: { hospitalId: string }) {
  const {
    data: routes,
    isLoading,
    mutate,
  } = useSWR<AeRouteType[]>(`${hospitalId}-ae-routes`, () => fetchRoutes(hospitalId));
  const { data: hospitals } = useSWR<HospitalOption[]>("hospitals-list", fetchHospitals);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AeRouteType | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [optimisticRoutes, addOptimistic] = useOptimistic(
    routes ?? [],
    (state: AeRouteType[], { id, is_active }: { id: string; is_active: boolean }) =>
      state.map((r) => (r.id === id ? { ...r, is_active } : r)),
  );

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async (form: FormState) => {
    const { error } = await supabase.from("ae_route").insert({
      hospital_id: form.hospital_id,
      ae_title: form.ae_title,
      host: form.host,
      port: form.port,
      description: form.description || null,
      is_active: form.is_active,
    });
    if (error) {
      toast.error(error.message);
      throw error;
    }
    toast.success("AE Route created");
    mutate();
  };

  // ── Update ────────────────────────────────────────────────────────────────
  const handleUpdate = async (form: FormState) => {
    if (!editing) return;
    const { error } = await supabase
      .from("ae_route")
      .update({
        ae_title: form.ae_title,
        host: form.host,
        port: form.port,
        description: form.description || null,
        is_active: form.is_active,
      })
      .eq("id", editing.id);
    if (error) {
      toast.error(error.message);
      throw error;
    }
    toast.success("AE Route updated");
    mutate();
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("ae_route").delete().eq("id", id);
      if (error) {
        toast.error(error.message);
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
    startTransition(async () => {
      addOptimistic({ id: route.id, is_active: !route.is_active });

      const { error } = await supabase
        .from("ae_route")
        .update({ is_active: !route.is_active })
        .eq("id", route.id);

      if (error) {
        toast.error("Failed to update status");
        mutate();
        return;
      }

      mutate(
        (current) =>
          current?.map((r) => (r.id === route.id ? { ...r, is_active: !route.is_active } : r)),
        { revalidate: false },
      );
    });
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 mb-4 items-start sm:items-center justify-between">
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
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
              <th className="py-3 px-3 text-left uppercase text-xs font-semibold text-gray-500 w-36">
                Hospital
              </th>
              <th className="py-3 px-3 text-left uppercase text-xs font-semibold text-gray-500 w-32">
                AE Title
              </th>
              <th className="py-3 px-3 text-left uppercase text-xs font-semibold text-gray-500 w-36">
                Host
              </th>
              <th className="py-3 px-3 text-left uppercase text-xs font-semibold text-gray-500 w-16">
                Port
              </th>
              <th className="py-3 px-3 text-left uppercase text-xs font-semibold text-gray-500">
                Description
              </th>
              <th className="py-3 px-3 text-center uppercase text-xs font-semibold text-gray-500 w-20">
                Status
              </th>
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
          {!isLoading && routes?.length === 0 && (
            <tbody>
              <tr>
                <td colSpan={7} className="text-center py-16 text-gray-400">
                  <Icon
                    icon="solar:server-minimalistic-linear"
                    fontSize={40}
                    className="mx-auto mb-3"
                  />
                  <p className="text-sm">No AE routes found</p>
                  <p className="text-xs mt-1">Add a PACS connection to get started</p>
                </td>
              </tr>
            </tbody>
          )}

          {/* Rows */}
          {!isLoading && routes && routes.length > 0 && (
            <tbody>
              {optimisticRoutes.map((route, index) => (
                <tr
                  key={route.id}
                  className={`border-t border-gray-100 hover:bg-cyan-50/30 transition-colors ${
                    index % 2 === 0 ? "bg-gray-50/50" : "bg-white"
                  }`}
                >
                  <td
                    className="py-4 px-3 truncate font-medium text-gray-700"
                    title={route.hospital?.name}
                  >
                    {route.hospital?.name ?? "—"}
                  </td>
                  <td className="py-4 px-3 font-mono text-xs text-gray-700">{route.ae_title}</td>
                  <td className="py-4 px-3 font-mono text-xs text-gray-600 truncate">
                    {route.host}
                  </td>
                  <td className="py-4 px-3 font-mono text-xs text-gray-600">{route.port}</td>
                  <td
                    className="py-4 px-3 text-gray-500 truncate text-xs"
                    title={route.description ?? ""}
                  >
                    {route.description ?? "—"}
                  </td>
                  <td className="py-4 px-3 text-center">
                    <div className="flex items-center gap-3">
                      <PopoverInnerButton title={route.is_active ? "Desactive" : "Active"}>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(route)}
                          className={`relative w-10 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
                            route.is_active ? "bg-cyan-400" : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                              route.is_active ? "translate-x-0" : "-translate-x-4"
                            }`}
                          />
                        </button>
                      </PopoverInnerButton>
                    </div>
                  </td>
                  <td className="py-4 px-3">
                    <div className="flex items-center justify-end gap-1">
                      <CircularSecondaryButton
                        onClick={() => {
                          setEditing(route);
                          setModalOpen(true);
                        }}
                        title="Edit"
                      >
                        <Icon icon="solar:pen-linear" width={ICON_SIZE} height={ICON_SIZE} />
                      </CircularSecondaryButton>
                      <DeleteButton
                        onClick={() => handleDelete(route.id)}
                        title="Delete"
                        isDeleting={deletingId === route.id}
                      />
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
