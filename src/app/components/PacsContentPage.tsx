"use client";

import useCheckPermission from "@/hooks/useCheckPermission";
import { useState } from "react";
import { Permissions } from "@/types/propertyState";

const GRUPOQUITO = { ip: "168.121.46.225", port: 3201, aet: "PACS-GRUPOQUITO" };

interface Dataset {
  patientName: string;
  studyDate: string;
  studyDescription: string;
  modalitiesInStudy: string;
}

export default function PacsPageContent({
  userRoleId,
}: {
  userRoleId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [studies, setStudies] = useState<Dataset[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { hasPermission: canManagePacs, isLoading: isLoading } =
    useCheckPermission(userRoleId, Permissions.MANAGE_PACS);

  const fetchStudies = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/pacs/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip: GRUPOQUITO.ip,
          port: GRUPOQUITO.port,
          aet: GRUPOQUITO.aet,
          startDate: "2025-06-08",
          endDate: "2025-06-09",
        }),
      });

      const data = await response.json();
      console.log(data);
      if (data.ok) {
        setStudies(data.studies);
      } else {
        setError(data.error || "Query failed");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return "loading ...";
  if (!canManagePacs) return null;

  return (
    <>
      <div className="p-4 space-y-4">
        <button
          onClick={fetchStudies}
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={loading}
        >
          {loading ? "Loading…" : "Query PACS"}
        </button>

        {error && <p className="text-red-600">❌ {error}</p>}

        <ul className="space-y-2">
          {studies.map(({ patientName, studyDate }, index) => (
            <li key={index} className="border p-2 rounded bg-gray-100">
              <p>
                <strong>Patient Name:</strong> {patientName}
              </p>
              <p>
                <strong>Study Date:</strong> {studyDate}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
