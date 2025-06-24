"use client";

import FallbackPermission from "@/components/FallbackPermission";
import { Permissions } from "@/types/propertyState";
import useCheckPermission from "@/hooks/useCheckPermission";
import UploaderR2 from "./UploaderR2";
import { useState } from "react";
import { UPLOAD_OPTION } from "@/enums/uploadOption";

export default function UploaderPage({
  userRoleId,
  userId,
  userEmail,
}: {
  userRoleId: string;
  userId: string;
  userEmail: string;
}) {
  const [option, setOption] = useState(UPLOAD_OPTION.COMPRESSED);

  const { hasPermission, isLoading } = useCheckPermission(
    userRoleId,
    Permissions.UPLOAD_DICOM
  );

  if (isLoading)
    return (
      <div className="animate-pulse w-full h-[266px] rounded-2xl border border-dashed border-gray-200"></div>
    );

  if (!hasPermission) return <FallbackPermission />;

  return (
    <>
      <div className="mb-4 flex gap-2 items-center flex-wrap">
        {Object.values(UPLOAD_OPTION).map((value) => {
          return (
            <button
              key={value}
              onClick={() => setOption(value)}
              className={`${option === value ? "bg-cyan-50 border-cyan-200" : "hover:bg-gray-100 border-transparent"} border px-5 py-2 rounded-lg cursor-pointer transition-colors duration-300`}
            >
              {value}
            </button>
          );
        })}
      </div>
      <UploaderR2
        option={option}
        setOption={setOption}
        userId={userId}
        userRoleId={userRoleId}
        userEmail={userEmail}
      />
    </>
  );
}
