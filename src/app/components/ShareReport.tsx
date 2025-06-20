"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import FieldLabel from "./FieldLabel";
import FieldsSection from "./FieldsSection";
import { supabase } from "@/lib/supabase";
import getExpirationTime from "@/lib/getExpirationTime";

type TimeType = "24 hours" | "48 hours" | "84 months";

enum Time {
  _24Hours = "24 hours",
  _48Hours = "48 hours",
  _84Months = "84 months",
}

export default function ShareReport({
  userId,
  dicomId,
}: {
  userId: string;
  dicomId: string;
}) {
  const [time, setTime] = useState<TimeType | null>(Time._24Hours);
  const [sharedLinkId, setSharedLinkId] = useState<string | null>(null);

  const createShareLink = async (
    userId: string,
    dicomId: string,
    time: TimeType | null
  ) => {
    const expireAt = getExpirationTime(time as Time);

    const values = {
      dicom_id: dicomId,
      created_by: userId,
      expire_at: expireAt,
    };

    const { data: existing, error: fetchError } = await supabase
      .from("shared_link")
      .select("id")
      .match(values)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existing) {
      return existing.id;
    }

    const { data } = await supabase
      .from("shared_link")
      .insert([
        {
          dicom_id: dicomId,
          created_by: userId,
          expire_at: expireAt,
        },
      ])
      .select("id")
      .single();

    if (data) {
      setSharedLinkId(data.id);
    }
  };

  const handleTimeChange = (newTime: TimeType) => {
    createShareLink(userId, dicomId, newTime);
    setTime(newTime);
  };
  const copyLink = async (link: string) => {
    if (!link) return toast.error("Failed to create share link");

    navigator.clipboard.writeText(link).then(() => {
      toast.success("Link copied to clipboard!");
    });
  };

  const shareViaEmail = () => {
    toast.success("Email shared successfully!");
  };

  useEffect(() => {
    if (time) {
      createShareLink(userId, dicomId, time);
    }
  }, [dicomId, time, userId]);

  return (
    <>
      <h1 className="font-semibold text-xl mb-6">Share</h1>
      <div className="mb-4">
        {Object.entries(Time).map((t) => {
          const [key, value] = t;

          return (
            <button
              key={key}
              onClick={() => handleTimeChange(Time[key as keyof typeof Time])}
              className={`${value === time ? "bg-cyan-50 border-cyan-200" : "border-transparent"} border px-5 py-2 rounded-lg cursor-pointer transition-colors duration-300`}
            >
              {value}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-4">
        <FieldsSection>
          <h2 className="font-semibold">Direct link</h2>
          <div>
            <div className="inline-block mb-2 text-sm">
              Anyone with the link can access
            </div>
            <div className="relative w-full">
              <div className="truncate text-gray-500 pr-30 w-full px-4 bg-white py-2.5 rounded-xl border border-gray-200">
                {`${process.env.NEXT_PUBLIC_URL}/view/pdf/${sharedLinkId}`}
              </div>
              <button
                onClick={() =>
                  copyLink(
                    `${process.env.NEXT_PUBLIC_URL}/view/pdf/${sharedLinkId}`
                  )
                }
                className="hover:bg-cyan-50 hover:border-cyan-200 cursor-pointer transition-colors duration-300 absolute right-1 top-1/2 -translate-y-1/2 text-sm bg-gray-50 border px-5 py-2 border-gray-200 rounded-lg"
              >
                Copy link
              </button>
            </div>
          </div>
        </FieldsSection>
        <FieldsSection>
          <h2 className="font-semibold">Via Email</h2>
          <div className="flex gap-4 items-center">
            <div className="grow-1 relative">
              <FieldLabel htmlFor="via-email">Email</FieldLabel>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  id="via-email"
                  required
                  className="w-full bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
                />
                <button
                  onClick={shareViaEmail}
                  className="font-semibold flex-shrink-0 cursor-pointer transition-colors duration-300 text-sm text-white bg-black px-6 py-3 rounded-lg"
                >
                  Share
                </button>
              </div>
            </div>
          </div>
        </FieldsSection>
      </div>
    </>
  );
}
