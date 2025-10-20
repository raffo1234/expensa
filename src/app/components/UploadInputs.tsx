"use client";

import { useState } from "react";
import RightsModal from "./RightsModal";
import UploadDicomButton from "./UploadDicomButton";

export default function UploadInputs({
  isDisabled,
  isUploading,
  count,
  handleUpload,
}: {
  isDisabled: boolean;
  isUploading: boolean;
  count: string | number;
  handleUpload: () => void;
}) {
  const [isRightsChecked, setIsRightsChecked] = useState(false);
  const isButtonDisabled = isDisabled || !isRightsChecked;

  return (
    <div>
      <RightsModal isRightsChecked={isRightsChecked} setIsRightsChecked={setIsRightsChecked} />
      <UploadDicomButton
        handleUpload={handleUpload}
        isUploading={isUploading}
        isDisabled={isButtonDisabled}
        count={count}
      />
    </div>
  );
}
