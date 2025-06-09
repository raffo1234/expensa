"use client";

import { useState } from "react";

const GRUPOQUITO = { ip: "168.121.46.225", port: 3201, aet: "PACS-GRUPOQUITO" };

interface Dataset {
  [tag: string]: unknown;
}

export default function PacsQuery() {
  const [loading, setLoading] = useState(false);
  const [studies, setStudies] = useState<Dataset[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  return (
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
        {studies.map((study, index) => (
          <li key={index} className="border p-2 rounded bg-gray-100">
            <p>
              <strong>Patient Name:</strong> {extractText(study["00100010"])}
            </p>
            <p>
              <strong>Study Date:</strong> {extractText(study["00080020"])}
            </p>
            <p>
              <strong>Study Description:</strong>{" "}
              {extractText(study["00081030"])}
            </p>
            <p>
              <strong>Study Instance UID:</strong>{" "}
              {extractText(study["0020000D"])}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Helper to extract value safely
function extractText(field: any): string {
  return field?.Value?.[0] || "(empty)";
}
