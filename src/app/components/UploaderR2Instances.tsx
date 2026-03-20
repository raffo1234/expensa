"use client";

import PopoverInnerButton from "@/components/PopoverInnerButton";
import { Permissions } from "@/types/propertyState";
import { fileTypeFromBuffer } from "file-type";
import { Archive } from "libarchive.js";
import React, { useCallback, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { useDropzone } from "react-dropzone";
import { ExtractedFilesObject } from "@/lib/decompress";
import { findAllDicomFilesWithDifferentStudyUID } from "@/lib/dicoms";
import sortFilesByName from "@/utils/sortFilesByName";
import { CustomFileStateType, CustomFileType } from "@/types/customFileType";
import { v4 as uuidv4 } from "uuid";
import useCheckPermission from "@/hooks/useCheckPermission";
import editCustomFileById from "@/lib/editCustomFileById";
import ViewAllDicomsLink from "./ViewAllDicomsLink";
import LinkInsertedOrDuplicated from "./LinkInsertedOrDuplicated";
import { UPLOAD_OPTION } from "@/enums/uploadOption";
import { compressFiles } from "@/lib/compressFiles";
import { UploaderR2Props } from "@/types/Dicom";
import { colorClassMap, ICON_SIZE } from "@/constants";
import ModalToAttachFilesToDicom from "./ModalToAttachFilesToDicom";
import ModalToCommentDicom from "./ModalToCommentDicom";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import UploadInputs from "./UploadInputs";
import FinalStep from "./FinalStep";
import { processDicomStudyTurbo } from "@/lib/processDicomStudyTurbo";
import { useDicomUploadSync } from "@/lib/useDicomUploadSync";
import pLimit from "p-limit";

if (typeof window !== "undefined") {
  Archive.init({ workerUrl: "/libarchive.js/dist/worker-bundle.js" });
}

declare module "react" {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string;
  }
}

const compressedMimeTypes = [
  "application/zip",
  "application/x-zip-compressed",
  "application/x-compressed",
  "application/x-rar-compressed", // RAR4
  "application/vnd.rar", // ✅ RAR5 (WinRAR 5+)
  "application/x-rar", // ✅ RAR fallback
];

const compressedExtensions: Record<string, string[]> = {
  "application/zip": [".zip"],
  "application/x-zip-compressed": [".zip"],
  "application/x-compressed": [".rar"],
  "application/x-rar-compressed": [".rar"],
  "application/vnd.rar": [".rar"], // ✅ RAR5
  "application/x-rar": [".rar"], // ✅ RAR fallback
};

// ✅ Precomputed outside component — never recreated
const compressedAcceptOptions = compressedMimeTypes.reduce(
  (acc: Record<string, string[]>, mime) => {
    acc[mime] = compressedExtensions[mime] || [];
    return acc;
  },
  {},
);

// Minimum bytes file-type needs to detect mime reliably
const MIN_BYTES_FOR_MIME_DETECTION = 4100;

// Truncates long file names for toast messages
const truncateFileName = (name: string, max = 40): string =>
  name.length > max ? `${name.slice(0, max)}...` : name;

// Safari-safe alternative to file.arrayBuffer() — works on all browser versions
const toArrayBuffer = (file: File): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });

const UploaderR2Instances: React.FC<UploaderR2Props> = ({
  option,
  setOption,
  userId,
  userEmail,
  onUploadSuccess,
  userRoleId,
}) => {
  const t = useTranslations("Uploader");
  const tZip = useTranslations("UploaderZip");
  const tDcm = useTranslations("UploaderDcm");
  // userEmail will be used for email notifications after upload
  void userEmail;

  const { hasPermission: storeByDefault } = useCheckPermission(
    userRoleId,
    Permissions.STORE_BY_DEFAULT,
  );
  const { hasPermission: canSwitchStoreDicom } = useCheckPermission(
    userRoleId,
    Permissions.SWITCH_STORE_DICOM,
  );

  const [uploading, setUploading] = useState(false);
  const [isDropping, setIsDropping] = useState(false);
  const [files, setFiles] = useState<CustomFileType[]>([]);

  const { pendingCount, failedCount, flushQueue, isResuming } = useDicomUploadSync(userId);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setIsDropping(true);
      const isFolder = option === UPLOAD_OPTION.FOLDER;

      if (isFolder) {
        const compressedFiles = await compressFiles(Array.from(acceptedFiles));
        if (compressedFiles instanceof File) {
          setFiles((prev) => [
            ...prev,
            {
              id: uuidv4(),
              studies: [],
              file: compressedFiles,
              patientName: compressedFiles.name,
              state: CustomFileStateType.selected,
              isAvailableForR2Upload: storeByDefault,
              color: "white",
              uploadPercentage: 0,
            },
          ]);
        }
        setIsDropping(false);
        return;
      }

      const nonCompressedFiles: ExtractedFilesObject = {};
      const compressedFilesList: File[] = [];

      for (const file of acceptedFiles) {
        // Guard: skip empty files
        if (file.size === 0) {
          console.warn(`Skipping empty file: ${file.name}`);
          continue;
        }

        const fileBuffer = await toArrayBuffer(file);

        // Guard: buffer too small for mime detection
        if (fileBuffer.byteLength < MIN_BYTES_FOR_MIME_DETECTION) {
          console.warn(`File too small for mime detection: ${file.name}`);
          toast.error(`"${truncateFileName(file.name)}" is too small or corrupt to be extracted.`);
          continue;
        }

        let isCompressed = false;
        try {
          const extensionFromBuffer = await fileTypeFromBuffer(fileBuffer);
          const fileExt = file.name.split(".").pop()?.toLowerCase();

          // ✅ Fallback to extension when mime detection fails (common with RAR5)
          isCompressed = extensionFromBuffer
            ? compressedMimeTypes.includes(extensionFromBuffer.mime)
            : fileExt === "zip" || fileExt === "rar";
        } catch {
          console.warn(`fileTypeFromBuffer failed for: ${file.name}, treating as non-compressed`);
          toast.error(`Could not read file: ${truncateFileName(file.name)}`);
        }

        if (isCompressed) {
          compressedFilesList.push(file);
        } else {
          nonCompressedFiles[file.name] = file;
        }
      }

      const studiesByInstanceUID = await findAllDicomFilesWithDifferentStudyUID(nonCompressedFiles);
      if (studiesByInstanceUID && studiesByInstanceUID.length > 0) {
        studiesByInstanceUID.forEach(({ file, metadata }) => {
          setFiles((prev) => [
            ...prev,
            {
              id: uuidv4(),
              studies: [],
              file,
              patientName: metadata.patientName ?? "",
              state: CustomFileStateType.selected,
              isAvailableForR2Upload: storeByDefault,
              color: "white",
              uploadPercentage: 0,
              imageUploadProgress: 0,
            },
          ]);
        });
      }

      // Process compressed files — extract DICOM metadata to get real patientName
      for (const file of compressedFilesList) {
        let extractedFiles: ExtractedFilesObject = {};

        try {
          const fileBuffer = await toArrayBuffer(file);

          // Guard: buffer too small for mime detection
          if (fileBuffer.byteLength < MIN_BYTES_FOR_MIME_DETECTION) {
            console.warn(`Compressed file too small for mime detection: ${file.name}`);
            throw new Error("File too small for mime detection");
          }

          const extensionFromBuffer = await fileTypeFromBuffer(fileBuffer);
          const mime = extensionFromBuffer?.mime;
          const fileExt = file.name.split(".").pop()?.toLowerCase();

          if (mime === "application/zip" || mime === "application/x-zip-compressed") {
            const { processZipFile } = await import("@/lib/decompress");
            extractedFiles = await processZipFile(file);
          } else if (
            mime === "application/x-compressed" ||
            mime === "application/x-rar-compressed" ||
            mime === "application/vnd.rar" ||
            mime === "application/x-rar" ||
            (!mime && fileExt === "rar")
          ) {
            const archiveRar = await Archive.open(file);
            extractedFiles = await archiveRar.extractFiles();
          }
        } catch {
          console.warn(`Extraction failed for: ${file.name}`);
          toast.error(
            `Could not extract file: ${truncateFileName(file.name)}. The file may be too small or corrupt.`,
          );
        }

        // If extraction failed entirely, skip adding to the list
        if (Object.keys(extractedFiles).length === 0) {
          continue;
        }

        // Read real patientName from DICOM metadata
        let patientName = file.name;
        try {
          const studies = await findAllDicomFilesWithDifferentStudyUID(extractedFiles);
          if (studies.length > 0 && studies[0].metadata.patientName) {
            patientName = studies[0].metadata.patientName;
          }
        } catch {
          // If metadata read fails, fall back to file.name
        }

        setFiles((prev) => [
          ...prev,
          {
            id: uuidv4(),
            studies: [],
            file,
            patientName,
            state: CustomFileStateType.selected,
            isAvailableForR2Upload: storeByDefault,
            color: "gray-50",
            uploadPercentage: 0,
            imageUploadProgress: 0,
          },
        ]);
      }

      setIsDropping(false);
    },
    [storeByDefault, option],
  );

  const handleUpload = useCallback(async () => {
    const sortedFiles = sortFilesByName(files, "desc").filter(
      (f) => f.state === CustomFileStateType.selected,
    );

    setUploading(true);
    let successCount = 0;
    const outerLimit = pLimit(2);

    await Promise.allSettled(
      sortedFiles.map((fileEntity) =>
        outerLimit(async () => {
          const updateProgress = (progress: number) => {
            editCustomFileById(setFiles, fileEntity.id, {
              uploadPercentage: progress,
              color: progress === 100 ? "emerald-50" : "cyan-50",
            });
          };

          const handleStateChange = (newState: CustomFileStateType) => {
            editCustomFileById(setFiles, fileEntity.id, {
              state: newState,
              color: newState === CustomFileStateType.inserted ? "emerald-50" : "cyan-50",
            });
          };

          try {
            updateProgress(0);
            handleStateChange(CustomFileStateType.processing);

            const studiesByInstanceUID = await processDicomStudyTurbo(
              fileEntity.file,
              userId,
              fileEntity.id,
              setFiles,
              updateProgress,
              handleStateChange,
              fileEntity.isAvailableForR2Upload,
            );

            if (!studiesByInstanceUID || studiesByInstanceUID.length === 0) {
              editCustomFileById(setFiles, fileEntity.id, {
                state: CustomFileStateType.noDcimFile,
                color: "rose-50",
              });
            } else {
              successCount++;
            }
          } catch (error) {
            console.error(`[UploaderR2] Error uploading ${fileEntity.patientName}:`, error);
            toast.error(`Error processing file: ${truncateFileName(fileEntity.patientName)}`);
            editCustomFileById(setFiles, fileEntity.id, {
              state: CustomFileStateType.errorLoading,
              color: "rose-50",
            });
          }
        }),
      ),
    );

    if (successCount > 0 && onUploadSuccess) onUploadSuccess();
    setUploading(false);
  }, [files, userId, onUploadSuccess]);

  // ✅ Memoized — only recomputes when option changes
  const acceptOptions = useMemo(() => {
    switch (option) {
      case UPLOAD_OPTION.DCM:
        return { "application/dicom": [".dcm"] };
      case UPLOAD_OPTION.FOLDER:
        return {};
      case UPLOAD_OPTION.COMPRESSED:
        return compressedAcceptOptions;
      default:
        return {};
    }
  }, [option]);

  const onDragEnter = useCallback(() => {
    if (option === UPLOAD_OPTION.DCM || option === UPLOAD_OPTION.FOLDER) return;
    setOption(UPLOAD_OPTION.COMPRESSED);
  }, [option, setOption]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDragEnter,
    accept: acceptOptions,
    onDrop,
  });

  const handleIsAvailableForR2 = useCallback((id: string, isAvailableForR2Upload: boolean) => {
    editCustomFileById(setFiles, id, { isAvailableForR2Upload: !isAvailableForR2Upload });
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const selectAllFiles = useCallback((shouldSelect: boolean): void => {
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.state === CustomFileStateType.selected
          ? { ...file, isAvailableForR2Upload: shouldSelect }
          : file,
      ),
    );
  }, []);

  const handleSelectAllChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      selectAllFiles(event.target.checked);
    },
    [selectAllFiles],
  );

  const selectedFilesWithStateSelected = useMemo(
    () => files.filter((file) => file.state === CustomFileStateType.selected),
    [files],
  );

  const isAllSelected = useMemo(
    () =>
      selectedFilesWithStateSelected.length > 0 &&
      selectedFilesWithStateSelected.every((file) => file.isAvailableForR2Upload),
    [selectedFilesWithStateSelected],
  );

  const hasSelectedItems = selectedFilesWithStateSelected.length > 0;

  const selectedFileCount = useMemo(
    () =>
      files.filter(
        (file) => file.state === CustomFileStateType.selected && file.isAvailableForR2Upload,
      ).length,
    [files],
  );

  const sortedFiles = useMemo(() => Array.from(sortFilesByName(files)), [files]);

  return (
    <>
      {(pendingCount > 0 || isResuming) && (
        <div className="mb-4 flex items-center gap-3 bg-cyan-50 border border-cyan-200 rounded-xl px-4 py-3">
          <svg
            className="animate-spin text-cyan-400 shrink-0"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 3c4.97 0 9 4.03 9 9" strokeDasharray="18">
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 12 12;360 12 12"
                dur="1s"
                repeatCount="indefinite"
              />
            </path>
          </svg>
          <span className="text-sm text-cyan-700 font-medium">
            {isResuming
              ? `Resuming ${pendingCount} interrupted upload${pendingCount !== 1 ? "s" : ""}...`
              : `${pendingCount} upload${pendingCount !== 1 ? "s" : ""} pending from last session`}
          </span>
          {!isResuming && (
            <button
              onClick={flushQueue}
              className="ml-auto text-xs font-semibold text-cyan-600 hover:text-cyan-800 underline"
            >
              Resume now
            </button>
          )}
        </div>
      )}

      {failedCount > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          <Icon
            icon="solar:shield-warning-outline"
            className="text-rose-400 shrink-0"
            fontSize={18}
          />
          <span className="text-sm text-rose-700 font-medium">
            {failedCount} upload{failedCount !== 1 ? "s" : ""} failed permanently and have been
            logged for review.
          </span>
        </div>
      )}

      <div
        {...getRootProps()}
        className={`${isDragActive ? "bg-cyan-50 border-cyan-100" : "bg-gray-50 border-gray-300"}
        ${uploading || isDropping ? "cursor-no-drop" : "cursor-pointer"}
        transition-all hover:outline-8 outline-cyan-50 duration-300 hover:border-cyan-200 bg-white flex flex-col group items-center justify-center py-20 w-full border border-dashed rounded-2xl px-4`}
      >
        <div className="w-11 h-11 relative mb-3">
          <svg
            className={`${uploading || isDropping ? "opacity-100" : "opacity-0"} text-gray-500 animate-spin absolute left-0 top-0 group-hover:text-cyan-400 transition-all duration-300`}
            xmlns="http://www.w3.org/2000/svg"
            width="42"
            height="42"
            viewBox="0 0 24 24"
          >
            <g
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            >
              <path strokeDasharray="18" d="M12 3c4.97 0 9 4.03 9 9">
                <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.3s" values="18;0" />
                <animateTransform
                  attributeName="transform"
                  dur="1.5s"
                  repeatCount="indefinite"
                  type="rotate"
                  values="0 12 12;360 12 12"
                />
              </path>
              <path
                strokeDasharray="60"
                d="M12 3c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9c-4.97 0 -9 -4.03 -9 -9c0 -4.97 4.03 -9 9 -9Z"
                opacity="0.3"
              >
                <animate fill="freeze" attributeName="stroke-dashoffset" dur="1.2s" values="60;0" />
              </path>
            </g>
          </svg>
          <Icon
            icon="solar:cloud-upload-broken"
            className={`${uploading || isDropping ? "opacity-0" : "opacity-100"} text-gray-700 absolute left-0 top-0 group-hover:text-cyan-400 transition-colors duration-300`}
            fontSize={42}
          />
        </div>
        {option === UPLOAD_OPTION.COMPRESSED ? (
          <h3 className="mb-2 text-sm font-semibold px-2 rounded-md bg-cyan-50 border border-cyan-100">
            {tZip("title")}
          </h3>
        ) : null}
        {option === UPLOAD_OPTION.DCM ? (
          <h3 className="text-center mb-2 border border-orange-100 px-3 text-orange-400 bg-orange-50 rounded-lg">
            {tDcm("title")}
          </h3>
        ) : null}
        <h2 className="text-gray-400 mb-1">
          {option} {option !== UPLOAD_OPTION.DCM ? `${t("containing")} .dcm` : ""} {t("files")}
        </h2>
        <h4 className="font-semibold text-lg mb-5">
          {option !== UPLOAD_OPTION.FOLDER ? t("drag") : t("folder")}
        </h4>
        {files.length > 0 ? (
          <div className="border border-gray-200 rounded-xl">
            <div className="flex items-center border-b border-gray-200 bg-gray-100 rounded-t-xl">
              <div className="border-r w-30 text-center text-sm text-gray-600 py-1 px-5 border-gray-200">
                {t("selected")}
              </div>
              <div className="border-r border-gray-200 w-30 text-center text-sm text-gray-600 py-1 px-5">
                {t("processed")}
              </div>
              <div className="w-30 text-center text-sm text-gray-600 py-1 px-5">Total</div>
            </div>
            <div className="flex items-center">
              <h5 className="border-r border-gray-200 w-30 text-center text-sm text-gray-600 py-1 px-5">
                {selectedFilesWithStateSelected.length}
              </h5>
              <h5 className="border-r border-gray-200 w-30 text-center text-sm text-gray-600 py-1 px-5">
                {files.filter((file) => file.state !== CustomFileStateType.selected).length}
              </h5>
              <h5 className="w-30 text-center text-sm text-gray-600 py-1 px-5">{files.length}</h5>
            </div>
          </div>
        ) : null}
        <input
          {...getInputProps()}
          disabled={uploading || isDropping}
          type="file"
          className="hidden"
          {...(option === UPLOAD_OPTION.FOLDER ? { webkitdirectory: "true" } : {})}
          multiple
        />
      </div>

      {files.length > 0 ? (
        <div className="mt-6">
          <div className="max-w-xl text-center text-lg mx-auto font-semibold mb-6">
            {files.length} {t("file-label", { count: files.length })}
          </div>
          {canSwitchStoreDicom ? (
            <div className="mx-auto max-w-3xl mb-4 pl-4.5 flex items-center gap-2">
              <label
                className={`${!hasSelectedItems ? "opacity-50 pointer-events-none" : ""} inline-flex items-center cursor-pointer`}
              >
                <input
                  type="checkbox"
                  disabled={!hasSelectedItems}
                  checked={isAllSelected}
                  className="sr-only peer"
                  onChange={handleSelectAllChange}
                />
                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-100 dark:peer-focus:ring-cyan-100 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-400 peer-checked:bg-cyan-400 dark:peer-checked:bg-cyan-400"></div>
              </label>
              <span className="text-xs font-semibold">
                {selectedFileCount} {t("to-storage", { count: selectedFileCount })}
              </span>
            </div>
          ) : null}
          <div className="w-full mx-auto max-w-3xl">
            <div className="flex flex-col gap-3">
              {sortedFiles.map(
                ({ id, patientName, state, color, studies, uploadPercentage }, index) => {
                  const showProgressBar =
                    files[index].isAvailableForR2Upload &&
                    uploadPercentage !== 100 &&
                    [
                      CustomFileStateType.verifying,
                      CustomFileStateType.selected,
                      CustomFileStateType.inserting,
                      CustomFileStateType.processing,
                      CustomFileStateType.processed,
                      CustomFileStateType.uploading,
                    ].includes(state);

                  const displayWarningIcon = [
                    CustomFileStateType.errorInserting,
                    CustomFileStateType.fileNotSupported,
                    CustomFileStateType.noDcimFile,
                    CustomFileStateType.noTag,
                    CustomFileStateType.errorLoading,
                    CustomFileStateType.errorUploading,
                  ].includes(state);

                  const canRemove = ![
                    CustomFileStateType.processing,
                    CustomFileStateType.uploading,
                    CustomFileStateType.inserting,
                  ].includes(state);

                  return (
                    <div
                      key={id}
                      className={`relative ${colorClassMap[color] ?? "border bg-white border-gray-200"} px-5 py-4 rounded-3xl min-w-0 flex-1`}
                    >
                      {canRemove && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFile(id);
                          }}
                          className="absolute -top-4 -right-3 h-8 w-8 rounded-full cursor-pointer text-gray-300 border border-slate-200 bg-white hover:text-rose-400 hover:border-rose-200 hover:bg-rose-50 transition-colors duration-300"
                          title="Quitar de la lista"
                        >
                          <PopoverInnerButton title="Quitar de la lista">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width={ICON_SIZE}
                              height={ICON_SIZE}
                              viewBox="0 0 1024 1024"
                            >
                              <path
                                fill="currentColor"
                                d="M764.3 214.6L512 466.9L259.7 214.6a32 32 0 0 0-45.1 45.1L466.8 512L214.5 764.2a32 32 0 1 0 45.1 45.2L512 557.2l252.3 252.3a32 32 0 0 0 45.1-45.1L557.1 512l252.3-252.4a32 32 0 1 0-45.1-45.2z"
                              />
                            </svg>
                          </PopoverInnerButton>
                        </button>
                      )}
                      <div className="flex">
                        {canSwitchStoreDicom ? (
                          <label
                            className={`${state !== CustomFileStateType.selected ? "opacity-40 pointer-events-none" : ""} inline-flex pt-1 cursor-pointer`}
                          >
                            <input
                              type="checkbox"
                              name={files[index].id}
                              checked={files[index].isAvailableForR2Upload}
                              disabled={state !== CustomFileStateType.selected}
                              onChange={() =>
                                handleIsAvailableForR2(
                                  files[index].id,
                                  files[index].isAvailableForR2Upload,
                                )
                              }
                              className="sr-only peer"
                            />
                            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-100 dark:peer-focus:ring-cyan-100 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-400 peer-checked:bg-cyan-400 dark:peer-checked:bg-cyan-400"></div>
                          </label>
                        ) : null}
                        <div className="flex-1 truncate pl-4">
                          <div className="text-sm truncate font-semibold mb-1">{patientName}</div>
                          <div className="text-sm text-gray-500">
                            {state === CustomFileStateType.selected || studies.length === 0 ? (
                              state
                            ) : (
                              <FinalStep
                                label={`${studies.length} Stud${studies.length === 1 ? "y" : "ies"}`}
                              />
                            )}
                          </div>
                        </div>
                        <div className="whitespace-nowrap pl-10 flex flex-col gap-2 justify-center flex-shrink-0">
                          {state === CustomFileStateType.duplicated ||
                          state === CustomFileStateType.inserted
                            ? studies.map(({ id, state }) => (
                                <div
                                  key={id}
                                  className="flex gap-2 items-center bg-slate-100 rounded-full p-2"
                                >
                                  <LinkInsertedOrDuplicated
                                    id={id}
                                    userId={userId}
                                    userRoleId={userRoleId}
                                    state={state}
                                    isDuplicated={state === CustomFileStateType.duplicated}
                                  />
                                  <ModalToAttachFilesToDicom dicomId={id} defaultPopoverOpen />
                                  <ModalToCommentDicom dicomId={id} />
                                </div>
                              ))
                            : null}
                          {displayWarningIcon && (
                            <Icon
                              icon="solar:shield-warning-outline"
                              className="text-rose-300"
                              fontSize="24"
                            />
                          )}
                        </div>
                      </div>
                      {showProgressBar ? (
                        <div className="mt-2 relative w-full group">
                          <div className="relative flex items-center w-full bg-gray-100 h-2.5 rounded-full">
                            <div
                              style={{
                                width: `${uploadPercentage}%`,
                                transition: "width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
                              }}
                              className="relative h-full rounded-full bg-[length:200%_200%] animate-[liquid_4s_linear_infinite] bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400"
                            >
                              <div className="absolute inset-0 opacity-40 animate-[bubble-rise_1.5s_linear_infinite] bg-[radial-gradient(circle,rgba(255,255,255,0.7)_1.2px,transparent_1.2px)] bg-[length:12px_12px]" />
                              <div className="absolute top-0.5 left-1 right-1 h-[30%] bg-gradient-to-b from-white/50 to-transparent rounded-full" />
                              <div className="absolute right-0 top-0 h-full w-4 bg-white/20 blur-[2px] rounded-r-full" />
                            </div>
                          </div>
                          <div className="absolute right-0 -top-5 text-xs text-gray-500">
                            {uploadPercentage}%
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                },
              )}
            </div>
          </div>
        </div>
      ) : null}

      {selectedFilesWithStateSelected.length > 0 ? (
        <UploadInputs
          handleUpload={handleUpload}
          isUploading={uploading}
          isDisabled={
            uploading || files.length === 0 || selectedFilesWithStateSelected.length === 0
          }
          count={selectedFilesWithStateSelected.length}
        />
      ) : null}

      {files.length > 0 ? (
        <div className="flex justify-center mt-3 w-full">
          <ViewAllDicomsLink userRoleId={userRoleId} />
        </div>
      ) : null}
    </>
  );
};

export default UploaderR2Instances;
