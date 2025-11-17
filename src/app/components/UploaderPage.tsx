"use client";

import FallbackPermission from "@/components/FallbackPermission";
import { Permissions } from "@/types/propertyState";
import useCheckPermission from "@/hooks/useCheckPermission";
import UploaderR2 from "./UploaderR2";
import { Suspense, useState } from "react";
import { UPLOAD_OPTION } from "@/enums/uploadOption";
import { supportsWebkitDirectory } from "@/lib/supportsWebkitDirectory";
import OptionButton from "./OptionButton";

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

  const { hasPermission, isLoading } = useCheckPermission(userRoleId, Permissions.UPLOAD_DICOM);

  if (isLoading)
    return (
      <div className="animate-pulse w-full h-[266px] rounded-2xl border border-dashed border-gray-200"></div>
    );

  if (!hasPermission) return <FallbackPermission />;

  return (
    <>
      <div className="mb-4 flex gap-2 items-center flex-wrap">
        {Object.values(UPLOAD_OPTION).map((value) => {
          const isFolder = value === UPLOAD_OPTION.FOLDER;

          if (isFolder && !supportsWebkitDirectory()) return null;

          return (
            <OptionButton key={value} onClick={() => setOption(value)} isActive={option === value}>
              {value}
            </OptionButton>
          );
        })}
      </div>
      <Suspense>
        <UploaderR2
          option={option}
          setOption={setOption}
          userId={userId}
          userRoleId={userRoleId}
          userEmail={userEmail}
        />
      </Suspense>
    </>
  );
}
