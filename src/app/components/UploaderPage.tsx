"use client";

import FallbackPermission from "@/components/FallbackPermission";
import { Permissions } from "@/types/propertyState";
import useCheckPermission from "@/hooks/useCheckPermission";
import UploaderR2 from "./UploaderR2";
import toast from "react-hot-toast";

export default function UploaderPage({
  userRoleId,
  userId,
  userEmail,
}: {
  userRoleId: string;
  userId: string;
  userEmail: string;
}) {
  const { hasPermission, isLoading } = useCheckPermission(
    userRoleId,
    Permissions.UPLOAD_DICOM
  );

  const sendEmailToUser = async () => {
    try {
      const response = await fetch("/api/send-email-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: userEmail,
          link: `https://cadia.pe`,
        }),
      });

      if (response.ok) {
        console.info("Email sent successfully!");
      } else {
        const errorData = await response.json();
        console.error(errorData.error || "Failed to send email.");
      }
    } catch (error) {
      console.error("Error sending email:", error);
    }
  };

  const sendEmailToAdmin = async () => {
    try {
      const response = await fetch("/api/send-email-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: "ivan.meza1@unmsm.edu.pe",
          link: `https://cadia.pe`,
        }),
      });

      if (response.ok) {
        console.info("Email sent successfully!");
      } else {
        const errorData = await response.json();
        console.error(errorData.error || "Failed to send email.");
        toast.error("Failed to send email.");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Failed to send email.");
    }
  };

  if (isLoading)
    return (
      <div className="animate-pulse w-full h-[266px] rounded-2xl border border-dashed border-gray-200"></div>
    );

  const onUploadSuccess = () => {
    toast.success("Upload successful!");

    sendEmailToAdmin();
    sendEmailToUser();
  };

  if (!hasPermission) return <FallbackPermission />;

  return (
    <UploaderR2
      userId={userId}
      userRoleId={userRoleId}
      onUploadSuccess={onUploadSuccess}
    />
  );
}
