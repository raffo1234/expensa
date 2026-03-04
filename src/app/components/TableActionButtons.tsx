"use client";

import { DicomStateEnum } from "@/enums/dicomStateEnum";
import DOCXPreview from "./DOCXPreview";
import GeneratePDFButton from "./GeneratePDFButton";
import Link from "next/link";
import { Icon } from "@iconify/react/dist/iconify.js";
import { DicomType } from "@/types/dicomType";
import useCheckPermission from "@/hooks/useCheckPermission";
import { Permissions } from "@/types/propertyState";
import deleteDicom from "@/lib/deleteDicom";
import { useSession } from "next-auth/react";
import { ICON_SIZE } from "@/constants";
import { DeleteDicomWithInstancesButton } from "./DeleteDicomWithInstancesButton";
import DeleteDuplicatedDicomButton from "./DeleteDuplicatedDicomButton";
import { useState } from "react";

interface DeleteDicomButtonsProps {
  dicom: DicomType;
  mutate: () => void;
}

function DeleteLegacyButton({ dicom, mutate }: { dicom: DicomType; mutate: () => void }) {
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <button
      title="Delete Dicom"
      onClick={() => deleteDicom(dicom.id, dicom.dicom_url || "", mutate, setIsDeleting)}
      type="button"
      className="aspect-square p-2 hover:bg-white flex-shrink-0 transition-colors duration-300 cursor-pointer bg-gray-100 rounded-full border-gray-200 border-dashed border text-rose-400 flex items-center justify-center"
    >
      {isDeleting ? (
        <Icon icon="solar:record-broken" className="animate-spin" fontSize={24} />
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={ICON_SIZE}
          height={ICON_SIZE}
          viewBox="0 0 24 24"
        >
          <path
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.5"
            d="M9.17 4a3.001 3.001 0 0 1 5.66 0m5.67 2h-17m14.874 9.4c-.177 2.654-.266 3.981-1.131 4.79s-2.195.81-4.856.81h-.774c-2.66 0-3.99 0-4.856-.81c-.865-.809-.953-2.136-1.13-4.79l-.46-6.9m13.666 0l-.2 3M9.5 11l.5 5m4.5-5l-.5 5"
          />
        </svg>
      )}
    </button>
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

  if (isLoadingCanDownload || isLoadingCanDelete || isLoadingCanDeleteOtherDicoms) return null;

  return (
    <div className="flex gap-1 justify-end">
      {dicom.state === DicomStateEnum.COMPLETED && canDownload ? (
        <>
          <GeneratePDFButton dicomId={dicom.id} />
          <DOCXPreview dicomId={dicom.id} />
        </>
      ) : null}

      <Link
        href={`/admin/dicoms/${dicom.id}`}
        title="Inform"
        className="py-2 px-6 flex gap-2 items-center bg-cyan-400 text-white rounded-full cursor-pointer"
      >
        <Icon
          icon={
            dicom.state === DicomStateEnum.COMPLETED
              ? "solar:file-check-linear"
              : "solar:document-add-linear"
          }
          fontSize={ICON_SIZE}
        />
        <span>{dicom.state !== DicomStateEnum.COMPLETED ? "Inform" : "Amend"}</span>
      </Link>
      {(canDelete && activeUserId === signedUserId) ||
      (canDeleteOtherDicoms && activeUserId !== signedUserId) ? (
        <DeleteDicomButtons dicom={dicom} mutate={mutate} />
      ) : null}
    </div>
  );
}
