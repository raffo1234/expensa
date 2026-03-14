"use client";

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

  return (
    <>
      <div className="mb-4 flex gap-2 items-center flex-wrap">
        {Object.values(UPLOAD_OPTION).map((value) => {
          if (value === UPLOAD_OPTION.FOLDER && !supportsWebkitDirectory()) return null;
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