"use client";

import { PacType } from "@/types/PacType";
import { Icon } from "@iconify/react/dist/iconify.js";
import DeletePac from "./DeletePac";
import { useDebouncedCallback } from "use-debounce";
import { supabase } from "@/lib/supabase";
import { mutate } from "swr";
import toast from "react-hot-toast";
import { useState } from "react";

export default function Pac({ pac }: { pac: PacType }) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(false);
  const { id, ip, aet_server, aet_client, port } = pac;

  const updatePac = async (id: string, newData: Partial<PacType>) => {
    try {
      await supabase.from("pac").update(newData).eq("id", id);
    } catch (error) {
      console.error(error);
    } finally {
      mutate("admin-pacs");
      toast.success("Report updated successfully!");
    }
  };

  const debouncedUpdate = useDebouncedCallback((id, value) => {
    updatePac(id, value);
  }, 300);

  const verifyConnection = async (pac: PacType) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/pacs/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip: pac.ip,
          port: pac.port,
          aet: pac.aet_server,
          startDate: "2025-06-08",
          endDate: "2025-06-09",
        }),
      });

      const data = await response.json();

      if (data.ok) {
        // setStudies(data.studies);
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
    <>
      <div
        key={id}
        className="relative border-t first:border-t-0 border-gray-200 flex gap-3.5 first:rounded-t-xl items-center justify-between text-left transition-colors duration-300"
      >
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex-col cursor-pointer hover:bg-gray-50 first:rounded-t-xl w-full items-start gap-1 flex md:flex-row sm:gap-3.5 md:items-center py-4 pl-6 pr-20"
        >
          <Icon
            icon="solar:alt-arrow-down-linear"
            fontSize={20}
            className={`
                            ${isOpen ? "rotate-180" : ""} 
                          transition-transform duration-500 flex-shrink-0`}
          />
          <span>{aet_server}</span>
        </button>
        <DeletePac pacId={id} />
      </div>
      {isOpen ? (
        <div className="px-12 py-10 border-t border-gray-200">
          <div className="flex-col items-start gap-1 flex md:flex-row sm:gap-3.5 md:items-center">
            <div className="flex gap-3.5 items-center">
              <button
                disabled={isLoading}
                type="button"
                onClick={() => verifyConnection(pac)}
              >
                Check {error ? "fail" : "success"}
              </button>
              <input
                onChange={(event) =>
                  debouncedUpdate(id, { ip: event.target.value })
                }
                placeholder="IP"
                defaultValue={ip}
                className="w-33 p-2 border border-transparent rounded-xl focus:outline-1 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
              />
              <input
                placeholder="Port"
                defaultValue={port}
                className="w-13 text-sm text-gray-500 p-2 border border-transparent rounded-xl focus:outline-1 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
                onChange={(event) =>
                  debouncedUpdate(id, { port: event.target.value })
                }
              />
            </div>
            <input
              placeholder="AET Server"
              defaultValue={aet_server}
              onChange={(event) =>
                debouncedUpdate(id, { aet_server: event.target.value })
              }
              className="text-sm  text-gray-500 p-2 border border-transparent rounded-xl focus:outline-1 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
            />
            <input
              onChange={(event) =>
                debouncedUpdate(id, { aet_client: event.target.value })
              }
              placeholder="AET Client (Optional)"
              defaultValue={aet_client}
              className="text-sm  text-gray-500 p-2 border border-transparent rounded-xl focus:outline-1 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
