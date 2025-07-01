"use client";

import { ReactMultiEmail } from "react-multi-email";
import { useState } from "react";
import toast from "react-hot-toast";
import FieldLabel from "./FieldLabel";
import FieldsSection from "./FieldsSection";
import { supabase } from "@/lib/supabase";
import getExpirationTime from "@/lib/getExpirationTime";
import { Icon } from "@iconify/react/dist/iconify.js";
import "../styles/react-multi-email.css";

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
  const [isSharing, setIsSharing] = useState(false);
  const [emails, setEmails] = useState<string[]>([]);
  const [isCopying, setIsCopying] = useState(false);

  const createShareLink = async (
    userId: string,
    dicomId: string,
    time: TimeType | null
  ) => {
    const expireAt = getExpirationTime(time as Time);

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
      return data.id;
    }
  };

  const copyLink = async (
    userId: string,
    dicomId: string,
    time: TimeType | null
  ) => {
    setIsCopying(true);
    const linkId = await createShareLink(userId, dicomId, time);

    if (!linkId) {
      setIsCopying(false);
      return toast.error("Failed to copy link");
    }

    const link = `${process.env.NEXT_PUBLIC_URL}/view/pdf/${linkId}`;

    navigator.clipboard.writeText(link).then(() => {
      toast.success("Link copied to clipboard!");
      setIsCopying(false);
    });
  };

  const shareViaEmail = async (
    userId: string,
    dicomId: string,
    time: TimeType | null
  ) => {
    setIsSharing(true);

    const linkId = await createShareLink(userId, dicomId, time);
    if (!linkId) {
      setIsSharing(false);
      return toast.error("Failed to share via email");
    }

    const link = `${process.env.NEXT_PUBLIC_URL}/view/pdf/${linkId}`;

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: emails,
          link,
        }),
      });

      if (response.ok) {
        toast.success("Email sent successfully!");
      } else {
        const errorData = await response.json();
        console.error(errorData.error || "Failed to send email.");
        toast.error("Failed to send email.");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Failed to send email.");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      <h1 className="font-semibold text-xl mb-6">Share</h1>
      <div className="mb-4">
        {Object.entries(Time).map((t) => {
          const [key, value] = t;

          return (
            <button
              key={key}
              onClick={() => setTime(Time[key as keyof typeof Time])}
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
              <div
                className="truncate text-gray-800 pr-40 w-full px-4 bg-white py-2.5 rounded-xl border border-gray-200"
                style={{ fontFamily: "monospace" }}
              >
                {`${process.env.NEXT_PUBLIC_URL}/view/pdf/${dicomId}`}
              </div>
              <button
                type="button"
                disabled={isCopying}
                onClick={() => copyLink(userId, dicomId, time)}
                className={`${isCopying ? "opacity-50" : ""}  hover:bg-cyan-50 hover:border-cyan-200 cursor-pointer transition-colors duration-300 absolute right-0.5 top-1/2 -translate-y-1/2 text-sm bg-gray-50 border px-5 py-2 border-gray-200 rounded-[10px]`}
              >
                <span className={isCopying ? "opacity-0" : "opacity-100"}>
                  Copy link
                </span>
                <Icon
                  icon="solar:record-broken"
                  className={`${
                    isCopying ? "opacity-100" : "opacity-0"
                  } animate-spin absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 text-gray-600`}
                  fontSize={24}
                />
              </button>
            </div>
          </div>
        </FieldsSection>
        <FieldsSection>
          <h2 className="font-semibold">Via Email</h2>
          <div className="mb-4">
            <FieldLabel htmlFor="via-email">Emails</FieldLabel>
            <div className="flex gap-2 items-start w-full">
              <ReactMultiEmail
                emails={emails}
                onChange={(_emails: string[]) => {
                  setEmails(_emails);
                }}
                getLabel={(
                  email: string,
                  index: number,
                  removeEmail: (index: number) => void
                ) => {
                  return (
                    <div
                      data-tag
                      key={index}
                      className="flex items-center gap-2 border border-gray-200 bg-gray-50 px-3 py-1 rounded-lg"
                    >
                      {email}
                      <button
                        type="button"
                        data-tag-handle
                        onClick={() => removeEmail(index)}
                        className="cursor-pointer hover:text-cyan-400 transition-colors duration-300"
                      >
                        <Icon
                          icon="solar:close-circle-outline"
                          fontSize={24}
                        ></Icon>
                      </button>
                    </div>
                  );
                }}
              />
              <button
                disabled={isSharing || emails.length === 0}
                type="button"
                title="Share via email"
                onClick={() => shareViaEmail(userId, dicomId, time)}
                className="disabled:opacity-70 relative disabled:pointer-events-none font-semibold flex-shrink-0 cursor-pointer transition-opacity duration-300 text-sm text-white bg-black px-6 py-3 rounded-lg"
              >
                <span className={isSharing ? "opacity-0" : "opacity-100"}>
                  Share
                </span>
                <Icon
                  icon="solar:record-broken"
                  className={`${
                    isSharing ? "opacity-100" : "opacity-0"
                  } animate-spin absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 text-gray-50`}
                  fontSize={24}
                />
              </button>
            </div>
          </div>
        </FieldsSection>
      </div>
    </>
  );
}
