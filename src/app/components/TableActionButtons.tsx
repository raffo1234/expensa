"use client";

import { DicomStateEnum } from "@/enums/dicomStateEnum";
import DOCXPreview from "./DOCXPreview";
import GeneratePDFButton from "./GeneratePDFButton";
import { DicomType } from "@/types/dicomType";
import useCheckPermission from "@/hooks/useCheckPermission";
import { Permissions } from "@/types/propertyState";
import deleteDicom from "@/lib/deleteDicom";
import { useSession } from "next-auth/react";
import { DeleteDicomWithInstancesButton } from "./DeleteDicomWithInstancesButton";
import DeleteDuplicatedDicomButton from "./DeleteDuplicatedDicomButton";
import { Dispatch, SetStateAction, useState } from "react";
import InformButton from "./InformButton";
import { useConfirmModal } from "@/hooks/useConfirmModal";
import DeleteButton from "./DeleteButton";

interface DeleteDicomButtonsProps {
  dicom: DicomType;
  mutate: () => void;
}

function DeleteLegacyButton({ dicom, mutate }: { dicom: DicomType; mutate: () => void }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const title = "Delete";

  const { confirm } = useConfirmModal();
  const handleDelete = (
    id: string,
    dicomUrl: string | null,
    mutate: () => void,
    setIsDeleting: Dispatch<SetStateAction<boolean>>,
  ) => {
    confirm({
      title: title,
      description: "This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "default",
      onConfirm: () => deleteDicom(id, dicomUrl, mutate, setIsDeleting),
    });
  };

  return (
    <DeleteButton
      title="Delete study"
      isDeleting={isDeleting}
      onClick={() => handleDelete(dicom.id, dicom.dicom_url || "", mutate, setIsDeleting)}
    />
  );
}

function DeleteDicomButtons({ dicom, mutate }: DeleteDicomButtonsProps) {
  const renderButton = () => {
    switch (true) {
      case !!dicom.is_duplicated:
        return <DeleteDuplicatedDicomButton mutate={mutate} dicomId={dicom.id} />;

      case !!(dicom?.instances?.length && dicom.study_instance_uid):
        return (
          <DeleteDicomWithInstancesButton
            mutate={mutate}
            dicomId={dicom.id}
            studyUID={dicom.study_instance_uid}
          />
        );

      default:
        return <DeleteLegacyButton mutate={mutate} dicom={dicom} />;
    }
  };

  return renderButton();
}

interface TableActionButtonsProps {
  dicom: DicomType;
  userRoleId: string;
  activeUserId: string;
  mutate: () => void;
}

export default function TableActionButtons({
  dicom,
  userRoleId,
  activeUserId,
  mutate,
}: TableActionButtonsProps) {
  const { data: session } = useSession();
  const signedUserId = session?.user?.id || "";

  const { hasPermission: canDownload, isLoading: isLoadingCanDownload } = useCheckPermission(
    userRoleId,
    Permissions.DOWNLOAD_REPORT,
  );

  const { hasPermission: canDelete, isLoading: isLoadingCanDelete } = useCheckPermission(
    userRoleId,
    Permissions.DELETE_REPORT,
  );

  const { hasPermission: canDeleteOtherDicoms, isLoading: isLoadingCanDeleteOtherDicoms } =
    useCheckPermission(userRoleId, Permissions.DELETE_OTHER_DICOMS);

  const canDeleteMyDicom = canDelete && activeUserId === signedUserId;
  const canDeleteOtherDicom = canDeleteOtherDicoms && activeUserId !== signedUserId;

  if (isLoadingCanDownload || isLoadingCanDelete || isLoadingCanDeleteOtherDicoms) return null;

  return (
    <div className="flex gap-1 justify-end">
      {dicom.state === DicomStateEnum.COMPLETED && canDownload ? (
        <>
          <GeneratePDFButton dicomId={dicom.id} />
          <DOCXPreview dicomId={dicom.id} />
        </>
      ) : null}
      <InformButton dicomState={dicom.state} dicomId={dicom.id} />
      {canDeleteMyDicom || canDeleteOtherDicom ? (
        <DeleteDicomButtons dicom={dicom} mutate={mutate} />
      ) : null}
    </div>
  );
}
