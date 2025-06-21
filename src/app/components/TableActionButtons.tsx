import { DicomStateEnum } from "@/enums/dicomStateEnum";
import DOCXPreview from "./DOCXPreview";
import GeneratePDFButton from "./GeneratePDFButton";
import Link from "next/link";
import { Icon } from "@iconify/react/dist/iconify.js";
import { DicomType } from "@/types/dicomType";
import useCheckPermission from "@/hooks/useCheckPermission";
import { Permissions } from "@/types/propertyState";
import deleteDicom from "@/lib/deleteDicom";
import { useState } from "react";
import { useSession } from "next-auth/react";

export default function TableActionButtons({
  dicom,
  userRoleId,
  activeUserId,
  mutate,
}: {
  dicom: DicomType;
  userRoleId: string;
  activeUserId: string;
  mutate: () => void;
}) {
  const { data: session } = useSession();
  const signedUserId = session?.user?.id || "";

  const [isDeleting, setIsDeleting] = useState(false);
  const { hasPermission: canDownload, isLoading: isLoadingCanDownload } =
    useCheckPermission(userRoleId, Permissions.DOWNLOAD_REPORT);

  const { hasPermission: canDelete, isLoading: isLoadingCanDelete } =
    useCheckPermission(userRoleId, Permissions.DELETE_REPORT);

  const {
    hasPermission: canDeleteOtherDicoms,
    isLoading: isLoadingCanDeleteOtherDicoms,
  } = useCheckPermission(userRoleId, Permissions.DELETE_OTHER_DICOMS);

  if (
    isLoadingCanDownload ||
    isLoadingCanDelete ||
    isLoadingCanDeleteOtherDicoms
  )
    return null;

  return (
    <div className="flex gap-1 justify-end">
      {dicom.state === DicomStateEnum.COMPLETED && canDownload ? (
        <>
          <GeneratePDFButton dicom={dicom} label="PDF" />
          <DOCXPreview dicom={dicom} />
        </>
      ) : null}
      <Link
        href={`/admin/dicoms/${dicom.id}`}
        title="Inform"
        className="py-2 px-6 flex gap-3 items-center font-semibold bg-cyan-500 text-white rounded-full cursor-pointer"
      >
        <Icon
          icon={`${
            dicom.state === DicomStateEnum.COMPLETED
              ? "solar:file-check-linear"
              : "solar:document-add-linear"
          }`}
          fontSize={24}
        />
        <span>
          {dicom.state !== DicomStateEnum.COMPLETED ? "Inform" : "Amend"}
        </span>
      </Link>
      {(canDelete && activeUserId === signedUserId) ||
      (canDeleteOtherDicoms && activeUserId !== signedUserId) ? (
        <button
          title="Delete Dicom"
          onClick={() =>
            deleteDicom(dicom.id, dicom.dicom_url, mutate, setIsDeleting)
          }
          type="button"
          className=" hover:bg-white flex-shrink-0 transition-colors duration-300 cursor-pointer bg-gray-100 w-11 h-11 rounded-full border-gray-200 border-dashed border text-rose-400 flex items-center justify-center"
        >
          {isDeleting ? (
            <Icon
              icon="solar:record-broken"
              className="animate-spin"
              fontSize={24}
            />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
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
      ) : null}
    </div>
  );
}
