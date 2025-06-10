"use client";

import { PacType } from "@/types/PacType";
import { Icon } from "@iconify/react/dist/iconify.js";
import DeletePac from "./DeletePac";
import { useDebouncedCallback } from "use-debounce";
import { supabase } from "@/lib/supabase";
import { mutate } from "swr";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";

export default function Pac({ pac }: { pac: PacType }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [data, setData] = useState<false | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { id, ip, aet_server, is_verified, aet_client, port } = pac;

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
    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch("/api/pacs/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip: pac.ip,
          port: pac.port,
          aet_server: pac.aet_server,
          aet_client: pac.aet_client,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        setError(data.error || "Query failed");
        updatePac(id, { is_verified: false });
      } else {
        setData(data.ok);
        updatePac(id, { is_verified: true });
      }
    } catch (err) {
      setError((err as Error).message);
      updatePac(id, { is_verified: false });
    } finally {
      setIsVerifying(false);
    }
  };
  console.warn(error);

  useEffect(() => {
    if (error !== null || data !== null) {
      const timeout = setTimeout(() => {
        setError(null);
        setData(null);
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [error, data]);

  return (
    <>
      <div
        key={id}
        className="relative border-t first:border-t-0 border-gray-200 flex gap-3.5 first:rounded-t-xl items-center justify-between text-left transition-colors duration-300"
      >
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`${isOpen ? "bg-gray-50" : ""} flex-col cursor-pointer hover:bg-gray-50 first:rounded-t-xl w-full items-start gap-1 flex md:flex-row sm:gap-3.5 md:items-center py-4 pl-6 pr-20`}
        >
          <Icon
            icon="solar:alt-arrow-down-linear"
            fontSize={20}
            className={`${isOpen ? "rotate-180" : ""} transition-transform duration-500 flex-shrink-0`}
          />
          <span>{aet_server}</span>
          {is_verified ? (
            <svg
              className="text-green-400"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
            >
              <g fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m8.5 12.5l2 2l5-5"
                />
              </g>
            </svg>
          ) : null}
          {error ? (
            <svg
              className="text-rose-400"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
            >
              <g fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" d="m14.5 9.5l-5 5m0-5l5 5" />
              </g>
            </svg>
          ) : null}
        </button>
        <DeletePac pacId={id} />
      </div>
      {isOpen ? (
        <div className="px-12 py-10 border-t border-gray-200">
          <div className="flex-col items-start gap-1 flex md:flex-row sm:gap-3.5 md:items-center">
            <div className="flex gap-3.5 items-center">
              <button
                disabled={isVerifying}
                type="button"
                title="Verify connection"
                onClick={() => verifyConnection(pac)}
                className={`${isVerifying ? "pointer-events-none border-transparent" : "transition-colors duration-300 bg-gray-50 border-gray-200 cursor-pointer rounded-xl"} border p-2 text-cyan-500`}
              >
                {isVerifying ? (
                  <Icon
                    icon="solar:record-broken"
                    className="animate-spin"
                    fontSize={24}
                  />
                ) : (
                  <Icon icon="solar:shield-check-linear" fontSize={24} />
                )}
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
              className="text-sm text-gray-500 p-2 border border-transparent rounded-xl focus:outline-1 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
            />
            <input
              onChange={(event) =>
                debouncedUpdate(id, { aet_client: event.target.value })
              }
              placeholder="AET Client"
              defaultValue={aet_client}
              className="text-sm text-gray-500 p-2 border border-transparent rounded-xl focus:outline-1 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
