"use client";

import { Permissions } from "@/types/propertyState";
import { fileTypeFromBuffer } from "file-type";
import { Archive } from "libarchive.js";
import React, { useCallback, useState } from "react";
import { Icon } from "@iconify/react";
import { useDropzone } from "react-dropzone";
import { ExtractedFilesObject } from "@/lib/decompress";
import { findAllDicomFilesWithDifferentStudyUID } from "@/lib/dicoms";
import sortFilesByName from "@/utils/sortFilesByName";
import { CustomFileStateType, CustomFileType, Study } from "@/types/customFileType";
import { v4 as uuidv4 } from "uuid";
import useCheckPermission from "@/hooks/useCheckPermission";
import editCustomFileById from "@/lib/editCustomFileById";
import ViewAllDicomsLink from "./ViewAllDicomsLink";
import LinkInsertedOrDuplicated from "./LinkInsertedOrDuplicated";
import { UPLOAD_OPTION } from "@/enums/uploadOption";
import { compressFiles } from "@/lib/compressFiles";
import { UploaderR2Props } from "@/types/Dicom";
import { colorClassMap } from "@/constants";
import ModalToAttachFilesToDicom from "./ModalToAttachFilesToDicom";
import ModalToCommentDicom from "./ModalToCommentDicom";
import { useTranslations } from "next-intl";
import UploadInputs from "./UploadInputs";
import FinalStep from "./FinalStep";
import { processDicomStudyTurbo } from "@/lib/processDicomStudyTurbo";

if (typeof window !== "undefined") {
  Archive.init({
    workerUrl: "/libarchive.js/dist/worker-bundle.js",
  });
}

declare module "react" {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string;
  }
}

const compressedMimeTypes = [
  "application/zip",
  "application/x-zip-compressed",
  "application/x-compressed", // .rar
  "application/x-rar-compressed", // .rar
];

const compressedExtensions: Record<string, string[]> = {
  "application/zip": [".zip"],
  "application/x-zip-compressed": [".zip"],
  "application/x-compressed": [".rar"],
  "application/x-rar-compressed": [".rar"],
};

const UploaderR2: React.FC<UploaderR2Props> = ({
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

  const { hasPermission: storeByDefault } = useCheckPermission(
    userRoleId,
    Permissions.STORE_BY_DEFAULT,
  );

  // const { hasPermission: canSendEmailAfterUploading } = useCheckPermission(
  //   userRoleId,
  //   Permissions.SEND_EMAIL_AFTER_UPLOADING,
  // );

  console.warn(userEmail);
  const [uploading, setUploading] = useState(false);
  const [isDropping, setSiDropping] = useState(false);
  const [files, setFiles] = useState<CustomFileType[]>([]);

  const { hasPermission: canSwitchStoreDicom } = useCheckPermission(
    userRoleId,
    Permissions.SWITCH_STORE_DICOM,
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setSiDropping(true);
      const isFolder = option === UPLOAD_OPTION.FOLDER;

      // option === Folder
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
        setSiDropping(false);
        return;
      }

      const nonCompressedFiles: ExtractedFilesObject = {};
      const compressedFiles: File[] = [];

      for (const file of acceptedFiles) {
        const fileBuffer = await file.arrayBuffer();
        const extensionFromBuffer = await fileTypeFromBuffer(fileBuffer);

        const isCompressed = extensionFromBuffer
          ? compressedMimeTypes.includes(extensionFromBuffer.mime)
          : false;

        if (isCompressed) {
          compressedFiles.push(file);
        } else {
          nonCompressedFiles[file.name] = file;
        }
      }

      // Process non-compressed files (.dcm) -> option === .dcm
      const studiesByInstanceUID = await findAllDicomFilesWithDifferentStudyUID(nonCompressedFiles);
      if (studiesByInstanceUID && studiesByInstanceUID.length > 0) {
        studiesByInstanceUID.map(({ file, metadata }) => {
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

      // Process compressed files, option === compressed
      compressedFiles.map((file) => {
        setFiles((prev) => [
          ...prev,
          {
            id: uuidv4(),
            studies: [],
            file,
            patientName: file.name,
            state: CustomFileStateType.selected,
            isAvailableForR2Upload: storeByDefault,
            color: "gray-50",
            uploadPercentage: 0,
            imageUploadProgress: 0,
          },
        ]);
      });

      setSiDropping(false);
    },
    [storeByDefault, option],
  );

  const handleUpload = async () => {
    const sortedFiles = sortFilesByName(files, "desc");
    setUploading(true);

    for (let index = 0; index < sortedFiles.length; index++) {
      const fileEntity = files[index];

      if (fileEntity.state !== CustomFileStateType.selected) {
        console.info(`Skipping file at index ${index} because it is not in the selected state.`);
        continue;
      }

      const selectedFile = fileEntity.file;

      const fileBuffer = await selectedFile.arrayBuffer();
      const extensionFromBuffer = await fileTypeFromBuffer(fileBuffer);
      const mime = extensionFromBuffer?.mime;

      console.warn(`Processing file at index ${index}: ${selectedFile.name}, type: ${mime}`);

      const updateProgress = (progress: number, newState?: CustomFileStateType) => {
        editCustomFileById(setFiles, fileEntity.id, {
          uploadPercentage: progress,
          ...(newState && { state: newState }),
          color:
            progress === 100 || newState === CustomFileStateType.inserted
              ? "emerald-50"
              : "cyan-50",
        });
      };

      try {
        updateProgress(0, CustomFileStateType.processing);

        const studiesByInstanceUID = await processDicomStudyTurbo(
          selectedFile,
          userId,
          updateProgress,
          (newState) => updateProgress(fileEntity.uploadPercentage, newState),
          fileEntity.isAvailableForR2Upload,
        );

        updateProgress(100, CustomFileStateType.inserted);

        if (!studiesByInstanceUID || studiesByInstanceUID.length === 0) {
          editCustomFileById(setFiles, fileEntity.id, {
            state: CustomFileStateType.noDcimFile,
            color: "rose-50",
          });
          continue;
        }

        editCustomFileById(setFiles, fileEntity.id, {
          state: CustomFileStateType.inserted,
          color: "emerald-50",
          uploadPercentage: 100,
          studies: studiesByInstanceUID.map((id) => ({ id, state: CustomFileStateType.inserted })),
        });

        const studies: Study[] = [];
        for (const study of studiesByInstanceUID) {
          console.log(study);
          editCustomFileById(setFiles, fileEntity.id, {
            state: CustomFileStateType.verifying,
            color: "cyan-50",
          });

          editCustomFileById(setFiles, fileEntity.id, {
            state: CustomFileStateType.inserting,
            color: "bg-cyan-50",
          });

          editCustomFileById(setFiles, fileEntity.id, {
            state: CustomFileStateType.inserted,
            color: "green-50",
            studies,
          });

          //   // if (process.env.NODE_ENV !== "development") {
          //   //   if (canSendEmailAfterUploading) {
          //   //     await sendEmailToAdmin({ idDicom: study.id.toString() });
          //   //     await sendEmailToUser({ to: userEmail });
          //   //   }
          //   // }
        }
      } catch (error) {
        updateProgress(0, CustomFileStateType.errorLoading);
        console.error("Upload error:", error);
        editCustomFileById(setFiles, fileEntity.id, {
          state: CustomFileStateType.errorLoading,
          color: "rose-50",
        });
      }
    }
    if (onUploadSuccess) onUploadSuccess();
    setUploading(false);
  };

  const acceptOptions = () => {
    switch (option) {
      case UPLOAD_OPTION.DCM:
        return { "application/dicom": [".dcm"] };
      case UPLOAD_OPTION.FOLDER:
        return {};
      case UPLOAD_OPTION.COMPRESSED:
        return compressedMimeTypes.reduce((acc: Record<string, string[]>, mime) => {
          acc[mime] = compressedExtensions[mime] || [];
          return acc;
        }, {});
      default:
        return {};
    }
  };

  const onDragEnter = () => {
    setOption(UPLOAD_OPTION.COMPRESSED);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDragEnter,
    accept: acceptOptions(),
    onDrop,
  });

  const handleIsAvailableForR2 = (id: string, isAvailableForR2Upload: boolean) => {
    editCustomFileById(setFiles, id, {
      isAvailableForR2Upload: !isAvailableForR2Upload,
    });
  };

  const selectAllFiles = useCallback(
    (shouldSelect: boolean): void => {
      setFiles((prevFiles) =>
        prevFiles.map((file) => {
          if (file.state === CustomFileStateType.selected) {
            return { ...file, isAvailableForR2Upload: shouldSelect };
          }
          return file;
        }),
      );
    },
    [setFiles],
  );

  const handleSelectAllChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    selectAllFiles(isChecked);
  };

  const selectedFilesWithStateSelected = files.filter(
    (file) => file.state === CustomFileStateType.selected,
  );
  const isAllSelected =
    selectedFilesWithStateSelected.length > 0 &&
    selectedFilesWithStateSelected.every((file) => file.isAvailableForR2Upload);
  const hasSelectedItems = selectedFilesWithStateSelected.length > 0;
  const selectedFileCount = files.filter(
    (file) => file.state === CustomFileStateType.selected && file.isAvailableForR2Upload,
  ).length;

  return (
    <>
      <div
        {...getRootProps()}
        className={`${isDragActive ? "bg-cyan-50 border-cyan-100" : "bg-gray-50 border-gray-300"}
        ${uploading || isDropping ? "cursor-no-drop" : "cursor-pointer"}
        transition-all  hover:outline-8 outline-cyan-50 duration-300 hover:border-cyan-200 bg-white flex flex-col group items-center justify-center py-20 w-full border border-dashed rounded-2xl px-4`}
      >
        <div className="w-11 h-11 relative mb-3">
          <svg
            className={`${
              uploading || isDropping ? "opacity-100" : "opacity-0"
            } text-gray-500 animate-spin absolute left-0 top-0 group-hover:text-cyan-400 transition-all duration-300`}
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
            className={`${
              uploading || isDropping ? "opacity-0" : "opacity-100"
            } text-gray-700 absolute left-0 top-0 group-hover:text-cyan-400 transition-colors duration-300`}
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
              <div className="border-r border-gray-200 w-30 text-center text-sm text-gray-600 py-1 px-5 ">
                {t("processed")}
              </div>
              <div className="w-30 text-center text-sm text-gray-600 py-1 px-5 ">Total</div>
            </div>
            <div className="flex items-center">
              <h5 className=" border-r border-gray-200 w-30 text-center text-sm text-gray-600 py-1 px-5">
                {files.filter((file) => file.state === CustomFileStateType.selected).length}
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
            <div className="mx-auto max-w-xl mb-4 pl-4.5 flex items-center gap-2">
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
          <div className="w-full mx-auto max-w-xl">
            <div className="flex flex-col gap-2">
              {Array.from(sortFilesByName(files)).map(
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

                  return (
                    <div key={id} className="flex items-center gap-1">
                      <div
                        className={`${colorClassMap[color] ? colorClassMap[color] : "border bg-white border-gray-200"} px-4 py-3 rounded-lg min-w-0 flex-1`}
                      >
                        <div className="flex">
                          {canSwitchStoreDicom ? (
                            <label
                              className={`${
                                state !== CustomFileStateType.selected
                                  ? "opacity-40 pointer-events-none"
                                  : ""
                              } inline-flex pt-1 cursor-pointer`}
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
                            <div className="text-sm truncate font-semibold mb-0.5">
                              {patientName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {state === CustomFileStateType.selected || studies.length === 0 ? (
                                state
                              ) : (
                                <>
                                  {studies.length} Stud
                                  {studies.length === 1 ? "y" : "ies"}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="whitespace-nowrap pl-10 flex flex-col gap-2 justify-center flex-shrink-0">
                            {state === CustomFileStateType.duplicated ||
                            state === CustomFileStateType.inserted
                              ? studies.map(({ id, state }) => (
                                  <div key={id} className="flex gap-2 items-center">
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
                      <FinalStep />
                    </div>
                  );
                },
              )}
            </div>
          </div>
        </div>
      ) : null}
      {files.filter((file) => file.state === CustomFileStateType.selected).length ? (
        <UploadInputs
          handleUpload={handleUpload}
          isUploading={uploading}
          isDisabled={
            uploading ||
            files.length === 0 ||
            files.filter((file) => file.state === CustomFileStateType.selected).length === 0
          }
          count={files.filter((file) => file.state === CustomFileStateType.selected).length}
        />
      ) : null}
      {files.length ? (
        <div className="flex justify-center mt-3 w-full">
          <ViewAllDicomsLink userRoleId={userRoleId} />
        </div>
      ) : null}
    </>
  );
};

export default UploaderR2;
