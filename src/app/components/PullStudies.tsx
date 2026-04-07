"use client";

import { useState } from "react";
import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AeRoute {
  id: string;
  ae_title: string;
  host: string;
  port: number;
  description: string | null;
  hospital: { id: string; name: string } | null;
}

interface StudyResult {
  StudyInstanceUID: string;
  PatientName: string;
  PatientID: string;
  PatientAge: string;
  PatientSex: string;
  StudyDate: string;
  StudyDescription: string;
  Modality: string;
  NumberOfStudyRelatedInstances: string;
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

const fetchRoutes = async (): Promise<AeRoute[]> => {
  const { data, error } = await supabase
    .from("ae_route")
    .select("id, ae_title, host, port, description, hospital(id, name)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AeRoute[];
};

const inputClass =
  "w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-0 focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500";

const labelClass = "block text-xs font-semibold text-gray-500 uppercase mb-1.5";

// ─── Component ────────────────────────────────────────────────────────────────

export default function PullStudies() {
  const { data: routes, isLoading: loadingRoutes } = useSWR<AeRoute[]>(
    "ae-routes-active",
    fetchRoutes,
  );

  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [filters, setFilters] = useState({
    patientName: "",
    patientId: "",
    studyDate: "",
    modality: "",
    studyDescription: "",
  });

  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<StudyResult[] | null>(null);
  const [pullingUID, setPullingUID] = useState<string | null>(null);

  const selectedRoute = routes?.find((r) => r.id === selectedRouteId);

  const setFilter = (key: keyof typeof filters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value }));

  // ── C-FIND ────────────────────────────────────────────────────────────────
  const handleFind = async () => {
    if (!selectedRoute) {
      toast.error("Select a PACS connection first");
      return;
    }

    setSearching(true);
    setResults(null);

    try {
      const res = await fetch("/api/pull/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: selectedRoute.host,
          port: selectedRoute.port,
          aeTitle: selectedRoute.ae_title,
          filters,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "C-FIND failed");
        return;
      }

      setResults(data.results ?? []);

      if ((data.results ?? []).length === 0) {
        toast("No studies found", { icon: "🔍" });
      }
    } catch {
      toast.error("Failed to connect to PACS");
    } finally {
      setSearching(false);
    }
  };

  // ── C-MOVE ────────────────────────────────────────────────────────────────
  const handlePull = async (study: StudyResult) => {
    if (!selectedRoute) return;

    setPullingUID(study.StudyInstanceUID);

    try {
      const res = await fetch("/api/pull/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: selectedRoute.host,
          port: selectedRoute.port,
          aeTitle: selectedRoute.ae_title,
          studyInstanceUID: study.StudyInstanceUID,
          hospitalId: selectedRoute.hospital?.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Pull failed");
        return;
      }

      toast.success(
        `Pulled ${data.completed} instance(s)${data.failed > 0 ? ` — ${data.failed} failed` : ""}`,
      );
    } catch {
      toast.error("Failed to pull study");
    } finally {
      setPullingUID(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── PACS selector ── */}
      <div className="bg-white rounded-xl shadow p-5 space-y-4">
        <h2 className="font-semibold text-sm text-gray-700">PACS Connection</h2>

        <div>
          <label className={labelClass}>Select PACS</label>
          <select
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(e.target.value)}
            disabled={loadingRoutes}
            className={inputClass}
          >
            <option value="">{loadingRoutes ? "Loading..." : "Select a PACS connection..."}</option>
            {(routes ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.hospital?.name} — {r.ae_title} ({r.host}:{r.port})
              </option>
            ))}
          </select>
        </div>

        {selectedRoute && (
          <div className="flex gap-4 text-xs text-gray-500 font-mono bg-gray-50 rounded-lg px-4 py-2.5">
            <span>
              AE: <span className="text-gray-800">{selectedRoute.ae_title}</span>
            </span>
            <span>
              Host: <span className="text-gray-800">{selectedRoute.host}</span>
            </span>
            <span>
              Port: <span className="text-gray-800">{selectedRoute.port}</span>
            </span>
          </div>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-xl shadow p-5 space-y-4">
        <h2 className="font-semibold text-sm text-gray-700">Search Filters</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Patient Name</label>
            <input
              type="text"
              value={filters.patientName}
              onChange={(e) => setFilter("patientName", e.target.value)}
              placeholder="SMITH^JOHN or SMITH*"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Patient ID</label>
            <input
              type="text"
              value={filters.patientId}
              onChange={(e) => setFilter("patientId", e.target.value)}
              placeholder="12345678"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Study Date</label>
            <input
              type="text"
              value={filters.studyDate}
              onChange={(e) => setFilter("studyDate", e.target.value)}
              placeholder="20240101 or 20240101-20241231"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Modality</label>
            <input
              type="text"
              value={filters.modality}
              onChange={(e) => setFilter("modality", e.target.value.toUpperCase())}
              placeholder="CT, MR, US..."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Study Description</label>
            <input
              type="text"
              value={filters.studyDescription}
              onChange={(e) => setFilter("studyDescription", e.target.value)}
              placeholder="ABDOMEN*"
              className={inputClass}
            />
          </div>
        </div>

        <button
          onClick={handleFind}
          disabled={searching || !selectedRouteId}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white text-sm rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {searching ? (
            <Icon icon="solar:spinner-bold" className="animate-spin" fontSize={16} />
          ) : (
            <Icon icon="solar:magnifer-linear" fontSize={16} />
          )}
          {searching ? "Searching..." : "Search"}
        </button>
      </div>

      {/* ── Results ── */}
      {results !== null && (
        <div className="bg-white rounded-xl shadow overflow-auto">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-sm text-gray-700">
              Results <span className="text-gray-400 font-normal">({results.length})</span>
            </h2>
          </div>

          {results.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Icon icon="solar:file-search-linear" fontSize={40} className="mx-auto mb-3" />
              <p className="text-sm">No studies found</p>
            </div>
          ) : (
            <table className="text-sm w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left uppercase text-xs font-semibold text-gray-500 py-3 px-4">
                    Patient
                  </th>
                  <th className="text-left uppercase text-xs font-semibold text-gray-500 py-3 px-4">
                    ID
                  </th>
                  <th className="text-left uppercase text-xs font-semibold text-gray-500 py-3 px-4">
                    Date
                  </th>
                  <th className="text-left uppercase text-xs font-semibold text-gray-500 py-3 px-4">
                    Description
                  </th>
                  <th className="text-left uppercase text-xs font-semibold text-gray-500 py-3 px-4">
                    Mod
                  </th>
                  <th className="text-left uppercase text-xs font-semibold text-gray-500 py-3 px-4">
                    Inst
                  </th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody>
                {results.map((study, index) => (
                  <tr
                    key={study.StudyInstanceUID}
                    className={`border-t border-gray-100 ${index % 2 === 0 ? "bg-gray-50/50" : "bg-white"}`}
                  >
                    <td
                      className="py-3 px-4 font-medium truncate max-w-40"
                      title={study.PatientName}
                    >
                      {study.PatientName || "—"}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{study.PatientID || "—"}</td>
                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                      {study.StudyDate
                        ? `${study.StudyDate.slice(0, 4)}-${study.StudyDate.slice(4, 6)}-${study.StudyDate.slice(6, 8)}`
                        : "—"}
                    </td>
                    <td
                      className="py-3 px-4 text-gray-600 truncate max-w-48"
                      title={study.StudyDescription}
                    >
                      {study.StudyDescription || "—"}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{study.Modality || "—"}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {study.NumberOfStudyRelatedInstances || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handlePull(study)}
                        disabled={pullingUID === study.StudyInstanceUID}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-xs rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {pullingUID === study.StudyInstanceUID ? (
                          <Icon icon="solar:spinner-bold" className="animate-spin" fontSize={12} />
                        ) : (
                          <Icon icon="solar:download-linear" fontSize={12} />
                        )}
                        {pullingUID === study.StudyInstanceUID ? "Pulling..." : "Pull"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
