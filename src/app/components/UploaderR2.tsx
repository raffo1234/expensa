"use client";

import { Permissions } from "@/types/propertyState";
import { fileTypeFromBuffer } from "file-type";
import { Archive } from "libarchive.js";
import { supabase } from "@/lib/supabase";
import React, { useCallback, useState, type ChangeEvent } from "react";
import { Icon } from "@iconify/react";
import { useDropzone } from "react-dropzone";
import { ExtractedFilesObject, processZipFile } from "@/lib/decompress";
import { findAllDicomFilesWithDifferentStudyUID } from "@/lib/dicoms";
import sortFilesByName from "@/utils/sortFilesByName";
import {
  CustomFileStateType,
  CustomFileType,
  Study,
} from "@/types/customFileType";
import { v4 as uuidv4 } from "uuid";
import { sanitize } from "@/lib/sanitize";
import uploadSignedFile from "@/lib/uploadSignedFile";
import useCheckPermission from "@/hooks/useCheckPermission";
import editCustomFileById from "@/lib/editCustomFileById";
import ViewAllDicomsLink from "./ViewAllDicomsLink";
import { sendEmailToUser } from "@/utils/sendEmailToUser";
import { sendEmailToAdmin } from "@/utils/sendEmailToAdmin";
import LinkInsertedOrDuplicated from "./LinkInsertedOrDuplicated";
import { UPLOAD_OPTION } from "@/enums/uploadOption";
import { compressFiles } from "@/lib/compressFiles";
import { checkIfStudyExists, insertNewDataSet } from "@/lib/dicomDB";
import { UploaderR2Props } from "@/types/Dicom";
import { colorClassMap } from "@/constants";

Archive.init({
  workerUrl: "/libarchive.js/dist/worker-bundle.js",
});

declare module "react" {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string;
  }
}

const compressedMimeTypes = [
  "application/zip",
  "application/x-zip-compressed",
  "application/x-compressed", //.rar
  "application/x-rar-compressed", //.rar
];

const UploaderR2: React.FC<UploaderR2Props> = ({
  option,
  setOption,
  userId,
  userEmail,
  onUploadSuccess,
  userRoleId,
}) => {
  const { hasPermission: storeByDefault } = useCheckPermission(
    userRoleId,
    Permissions.STORE_BY_DEFAULT
  );

  const { hasPermission: canSendEmailAfterUploading } = useCheckPermission(
    userRoleId,
    Permissions.SEND_EMAIL_AFTER_UPLOADING
  );

  console.warn(userEmail);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDropping, setSiDropping] = useState(false);
  const [files, setFiles] = useState<CustomFileType[]>([]);

  const { hasPermission: canSwitchStoreDicom } = useCheckPermission(
    userRoleId,
    Permissions.SWITCH_STORE_DICOM
  );

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files || [];
    const isFolder = option === UPLOAD_OPTION.FOLDER;

    if (isFolder) {
      setIsCompressing(true);
      const compressedFiles = await compressFiles(Array.from(selectedFiles));

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
      setIsCompressing(false);
      return;
    }

    Array.from(selectedFiles).map((file) => {
      setFiles((prev) => [
        ...prev,
        {
          id: uuidv4(),
          studies: [],
          file,
          patientName: file.name,
          state: CustomFileStateType.selected,
          isAvailableForR2Upload: storeByDefault,
          color: "white",
          uploadPercentage: 0,
        },
      ]);
    });
  };

  const handleUpload = async () => {
    const sortedFiles = sortFilesByName(files, "desc");
    setUploading(true);

    for (let index = 0; index < sortedFiles.length; index++) {
      if (files[index].state !== CustomFileStateType.selected) {
        console.info(
          `Skipping file at index ${index} because it is not in the selected state.`
        );
        continue;
      }

      const selectedFile = files[index].file;

      editCustomFileById(setFiles, files[index].id, {
        state: CustomFileStateType.processing,
        color: "cyan-50",
      });

      const fileBuffer = await selectedFile.arrayBuffer();
      const extensionFromBuffer = await fileTypeFromBuffer(fileBuffer);
      const mime = extensionFromBuffer?.mime;

      console.warn(
        `Processing file at index ${index}: ${selectedFile.name}, type: ${mime}`
      );

      try {
        let extractedFiles: ExtractedFilesObject = {};
        switch (mime) {
          case "application/zip":
          case "application/x-zip-compressed":
            extractedFiles = await processZipFile(selectedFile);
            break;
          case "application/x-compressed":
          case "application/x-rar-compressed":
            const archiveRar = await Archive.open(selectedFile);
            extractedFiles = await archiveRar.extractFiles();
            break;
          case "application/dicom":
            extractedFiles = { [selectedFile.name]: selectedFile };
            break;
          default:
            editCustomFileById(setFiles, files[index].id, {
              state: CustomFileStateType.fileNotSupported,
              color: "rose-50",
            });
            continue;
        }

        const studiesByInstanceUID =
          await findAllDicomFilesWithDifferentStudyUID(extractedFiles);

        if (studiesByInstanceUID.length === 0) {
          editCustomFileById(setFiles, files[index].id, {
            state: CustomFileStateType.noDcimFile,
            color: "rose-50",
          });
          continue;
        }

        const studies: Study[] = [];
        for (const study of studiesByInstanceUID) {
          editCustomFileById(setFiles, files[index].id, {
            state: CustomFileStateType.verifying,
            color: "cyan-50",
          });

          const { id } = await checkIfStudyExists(
            supabase,
            userId,
            study.metadata
          );

          if (id) {
            editCustomFileById(setFiles, files[index].id, {
              state: CustomFileStateType.duplicated,
              color: "yellow-50",
              studies,
            });
            studies.push({
              id: id.toString(),
              state: CustomFileStateType.duplicated,
            });
            continue;
          }

          let publicUrl = undefined;
          const now = Date.now().toString();
          const filename = sanitize(`${now}_${selectedFile.name}`);

          if (files[index].isAvailableForR2Upload) {
            editCustomFileById(setFiles, files[index].id, {
              state: CustomFileStateType.uploading,
              color: "cyan-50",
            });

            const updateProgress = (progress: number) => {
              editCustomFileById(setFiles, files[index].id, {
                uploadPercentage: progress,
              });
            };

            const urlSigned = await uploadSignedFile(
              selectedFile,
              now,
              updateProgress
            );

            if (!urlSigned) {
              editCustomFileById(setFiles, files[index].id, {
                state: CustomFileStateType.errorUploading,
                color: "rose-50",
              });
              continue;
            }

            publicUrl = `${process.env.NEXT_PUBLIC_STORAGE_DOMAIN}/dicom/${filename}`;
          }

          editCustomFileById(setFiles, files[index].id, {
            state: CustomFileStateType.inserting,
            color: "bg-cyan-50",
          });

          const { id: insertedId } = await insertNewDataSet(
            supabase,
            userId,
            study.metadata,
            publicUrl
          );

          if (!insertedId) {
            editCustomFileById(setFiles, files[index].id, {
              state: CustomFileStateType.errorInserting,
              color: "rose-50",
            });
            continue;
          }

          if (insertedId) {
            studies.push({
              id: insertedId.toString(),
              state: CustomFileStateType.inserted,
            });

            editCustomFileById(setFiles, files[index].id, {
              state: CustomFileStateType.inserted,
              color: "green-50",
              studies,
            });

            if (process.env.NODE_ENV !== "development") {
              if (canSendEmailAfterUploading) {
                await sendEmailToAdmin();
                await sendEmailToUser({ to: userEmail });
              }
            }
          }
        }
      } catch {
        editCustomFileById(setFiles, files[index].id, {
          state: CustomFileStateType.errorLoading,
          color: "rose-50",
        });
      }
    }
    if (onUploadSuccess) onUploadSuccess();
    setUploading(false);
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setSiDropping(true);

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

      // Process non-compressed files
      const studiesByInstanceUID =
        await findAllDicomFilesWithDifferentStudyUID(nonCompressedFiles);

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
            },
          ]);
        });
      }

      // Process compressed files
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
          },
        ]);
      });

      setSiDropping(false);
    },
    [storeByDefault]
  );

  const acceptOptions = () => {
    switch (option) {
      case UPLOAD_OPTION.DCM:
        return { "application/dicom": [".dcm"] };
      case UPLOAD_OPTION.FOLDER:
        return {};
      case UPLOAD_OPTION.COMPRESSED:
        return compressedMimeTypes.reduce(
          (acc: Record<string, string[]>, mime) => {
            acc[mime] = [];
            return acc;
          },
          {}
        );
      default:
        return {};
    }
  };

  const onDragEnter = () => {
    setOption(UPLOAD_OPTION.COMPRESSED);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDragEnter,
    onDrop,
    accept: acceptOptions(),
  });

  const handleIsAvailableForR2 = (
    id: string,
    isAvailableForR2Upload: boolean
  ) => {
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
        })
      );
    },
    [setFiles]
  );

  const handleSelectAllChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const isChecked = event.target.checked;
    selectAllFiles(isChecked);
  };

  const selectedFilesWithStateSelected = files.filter(
    (file) => file.state === CustomFileStateType.selected
  );
  const isAllSelected =
    selectedFilesWithStateSelected.length > 0 &&
    selectedFilesWithStateSelected.every((file) => file.isAvailableForR2Upload);
  const hasSelectedItems = selectedFilesWithStateSelected.length > 0;
  const selectedFileCount = files.filter(
    (file) =>
      file.state === CustomFileStateType.selected && file.isAvailableForR2Upload
  ).length;

  return (
    <>
      <div
        {...getRootProps()}
        className={`${
          isDragActive
            ? "bg-cyan-50 border-cyan-100"
            : "bg-gray-50 border-gray-300"
        }
        ${uploading || isDropping || isCompressing ? "cursor-no-drop" : "cursor-pointer"}
        transition-all  hover:outline-8 outline-cyan-50 duration-300 hover:border-cyan-200 bg-white flex flex-col group items-center justify-center py-20 w-full border border-dashed rounded-2xl`}
      >
        <div className="w-11 h-11 relative mb-3">
          <Icon
            icon="solar:record-broken"
            className={`${
              uploading || isDropping || isCompressing
                ? "opacity-100"
                : "opacity-0"
            } text-gray-500 animate-spin absolute left-0 top-0 group-hover:text-cyan-400 transition-all duration-300`}
            fontSize={42}
          />
          <Icon
            icon="solar:cloud-upload-broken"
            className={`${
              uploading || isDropping || isCompressing
                ? "opacity-0"
                : "opacity-100"
            } text-gray-700 absolute left-0 top-0 group-hover:text-cyan-400 transition-colors duration-300`}
            fontSize={42}
          />
        </div>
        {option === UPLOAD_OPTION.COMPRESSED ? (
          <h3 className="mb-2 text-sm font-semibold px-2 rounded-md bg-cyan-50 border border-cyan-100">
            Most Popular
          </h3>
        ) : null}
        {option === UPLOAD_OPTION.DCM ? (
          <h3 className="text mb-2 border border-orange-100 px-3 text-orange-400 bg-orange-50 rounded-lg">
            Only access the patient&apos;s metadata, not to make a diagnosis.
          </h3>
        ) : null}
        <h2 className="text-gray-400 mb-1">
          {option} {option !== UPLOAD_OPTION.DCM ? "containing .dcm" : ""} files
        </h2>
        <h4 className="font-semibold text-lg mb-5">
          {option !== UPLOAD_OPTION.FOLDER
            ? "Drag and Drop your files here"
            : "Click here to choose a folder"}
        </h4>
        {files.length > 0 ? (
          <div className="border border-gray-200 rounded-xl">
            <div className="flex items-center border-b border-gray-200 bg-gray-100 rounded-t-xl">
              <div className="border-r w-30 text-center text-sm text-gray-600 py-1 px-5 border-gray-200">
                Selected
              </div>
              <div className="border-r border-gray-200 w-30 text-center text-sm text-gray-600 py-1 px-5 ">
                Processed
              </div>
              <div className="w-30 text-center text-sm text-gray-600 py-1 px-5 ">
                Total
              </div>
            </div>
            <div className="flex items-center">
              <h5 className=" border-r border-gray-200 w-30 text-center text-sm text-gray-600 py-1 px-5">
                {
                  files.filter(
                    (file) => file.state === CustomFileStateType.selected
                  ).length
                }
              </h5>
              <h5 className="border-r border-gray-200 w-30 text-center text-sm text-gray-600 py-1 px-5">
                {
                  files.filter(
                    (file) => file.state !== CustomFileStateType.selected
                  ).length
                }
              </h5>
              <h5 className="w-30 text-center text-sm text-gray-600 py-1 px-5">
                {files.length}
              </h5>
            </div>
          </div>
        ) : null}
        <input
          {...getInputProps()}
          onChange={handleFileChange}
          disabled={uploading || isDropping || isCompressing}
          type="file"
          className="hidden"
          {...(option === UPLOAD_OPTION.FOLDER
            ? { webkitdirectory: "true" }
            : {})}
          multiple
        />
      </div>
      {files.length > 0 ? (
        <div className="mt-6">
          <div className="max-w-xl text-center text-lg mx-auto font-semibold mb-6">
            {files.length} File{files.length !== 1 ? "s" : ""}
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
                {selectedFileCount} Selected file
                {selectedFileCount === 1 ? "" : "s"} to Storage
              </span>
            </div>
          ) : null}
          <div className="w-full mx-auto max-w-xl">
            <div className="flex flex-col gap-2">
              {Array.from(sortFilesByName(files)).map(
                (
                  { id, patientName, state, color, studies, uploadPercentage },
                  index
                ) => {
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
                    <div
                      key={id}
                      className={`${colorClassMap[color]} border-gray-300 border px-4 py-3 rounded-lg`}
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
                                  files[index].isAvailableForR2Upload
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
                            {state === CustomFileStateType.selected ||
                            studies.length === 0 ? (
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
                                <LinkInsertedOrDuplicated
                                  key={id}
                                  id={id}
                                  userId={userId}
                                  userRoleId={userRoleId}
                                  state={state}
                                  isDuplicated={
                                    state === CustomFileStateType.duplicated
                                  }
                                />
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
                        <div className="mt-2 relative w-full bg-gray-200 h-1 rounded-full">
                          <div
                            style={{ width: `${uploadPercentage}%` }}
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-100 animate-pulse to-cyan-400 rounded-full transition-all duration-300"
                          ></div>
                          <div className="absolute right-0 bottom-2.5 text-sm text-gray-400">
                            {uploadPercentage}%
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>
      ) : null}
      {files.filter((file) => file.state === CustomFileStateType.selected)
        .length ? (
        <button
          type="button"
          className="flex mx-auto mt-4 gap-4 items-center text-white disabled:opacity-60 disabled:cursor-no-drop cursor-pointer font-semibold disabled:border-cyan-400 disabled:bg-cyan-400 py-3 px-10 bg-cyan-500 hover:bg-cyan-400 transition-colors duration-500 rounded-lg"
          disabled={
            uploading ||
            files.length === 0 ||
            files.filter((file) => file.state === CustomFileStateType.selected)
              .length === 0
          }
          onClick={handleUpload}
        >
          {uploading ? (
            <Icon
              icon="solar:record-broken"
              fontSize={26}
              className="animate-spin"
            />
          ) : (
            <Icon icon="solar:upload-minimalistic-linear" fontSize={26} />
          )}
          <span>
            {uploading
              ? "Processing..."
              : `Process File${
                  files.filter(
                    (file) => file.state === CustomFileStateType.selected
                  ).length === 1
                    ? ""
                    : "s"
                }`}
          </span>
        </button>
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
