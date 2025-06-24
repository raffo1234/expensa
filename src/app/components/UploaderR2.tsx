"use client";

import { Permissions } from "@/types/propertyState";
import { fileTypeFromBuffer } from "file-type";
import { Archive } from "libarchive.js";
import { supabase } from "@/lib/supabase";
import React, { useCallback, useState, type ChangeEvent } from "react";
import { Icon } from "@iconify/react";
import { useDropzone } from "react-dropzone";
import getAgeFromYYYYMMDD from "@/lib/getAgeFromYYYYMMDD";
import { ExtractedFilesObject, processZipFile } from "@/lib/decompress";
import { findAllDicomFilesWithDifferentStudyDescriptions } from "@/lib/dicoms";
import sortFilesByName from "@/utils/sortFilesByName";
import {
  CustomFileStateType,
  CustomFileType,
  Study,
} from "@/types/customFileType";
import { v4 as uuidv4 } from "uuid";
import { SupabaseClient } from "@supabase/supabase-js";
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

interface DicomElement {
  tag: string; // Hexadecimal tag string (e.g., 'x00100010')
  vr?: string; // Value Representation (e.g., 'PN', 'UI', 'DA') - Optional
  length: number; // Length of the value field
  dataOffset: number; // Offset in the byte stream where the value starts

  // If this element is a Sequence (SQ), it has an 'items' array.
  // The items in the array are also DicomElement objects.
  items?: DicomElement[]; // Items within a sequence are also DicomElements

  // If this element is an item within a Sequence (SQ), it has a 'dataSet' property
  // which is a nested DicomDataSet. This is optional because not all elements are sequence items.
  dataSet?: DicomDataSet; // Nested DataSet for sequence items - Optional

  // Add other properties if you use them (e.g., fragments for pixel data)
}

interface DicomDataSet {
  // elements is a map where keys are tag strings and values are DicomElement objects
  elements: { [tag: string]: DicomElement };
  // byteArray is the underlying byte array the dataset was parsed from
  byteArray: Uint8Array;

  // Methods for accessing element values - only including 'string' as used in the code
  string(tag: string): string | undefined;
  // Add other methods like int16, float, bytes etc. if you use them and need strict typing
}

interface DicomMetadata {
  patientId?: string;
  patientName?: string;
  patientAge?: string;
  studyDescription?: string;
  modality?: string;
  studyDate?: string;
  patientSex?: string;
  patientBirthDate?: string;
  institutionName?: string;
}

type UploaderR2Props = {
  option: UPLOAD_OPTION;
  setOption: React.Dispatch<React.SetStateAction<UPLOAD_OPTION>>;
  userId: string;
  userEmail: string;
  userRoleId: string;
  onUploadSuccess?: () => void;
};

interface CheckResult {
  id: string | null; // Null if not found
  error: Error | null;
}

interface InsertOperationResult {
  id: string | null; // Null if insertion failed
  error: Error | null;
}

async function checkIfDataSetExists(
  supabase: SupabaseClient,
  userId: string,
  dataSet: DicomMetadata
): Promise<CheckResult> {
  const table = "dicom"; // Define table name once

  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("patient_name", dataSet.patientName)
    .eq("study_date", dataSet.studyDate)
    .eq("study_description", dataSet.studyDescription)
    .eq("user_id", userId)
    .limit(1);

  if (error) {
    console.error("Error checking for existing record:", error.message);
    return { id: null, error: new Error(error.message) };
  }

  if (data && data.length > 0) {
    return { id: data[0].id, error: null };
  } else {
    return { id: null, error: null }; // No existing record found
  }
}

async function insertNewDataSet(
  supabase: SupabaseClient,
  userId: string,
  dataSet: DicomMetadata,
  publicUrl: string | undefined
): Promise<InsertOperationResult> {
  const table = "dicom"; // Define table name once

  const { data, error } = await supabase
    .from(table)
    .insert([
      {
        user_id: userId,
        patient_name: dataSet.patientName,
        patient_id: dataSet.patientId,
        patient_age:
          dataSet.patientAge ||
          getAgeFromYYYYMMDD(dataSet.patientBirthDate ?? ""),
        study_description: dataSet.studyDescription,
        modality: dataSet.modality,
        study_date: dataSet.studyDate,
        gender: dataSet.patientSex,
        birthday: dataSet.patientBirthDate,
        institution: dataSet.institutionName,
        dicom_url: publicUrl,
      },
    ])
    .select("id")
    .single();

  if (error) {
    console.error("Error inserting record:", error.message);
    return { id: null, error: new Error(error.message) };
  }

  if (data) {
    return { id: data.id, error: null };
  } else {
    console.error("Insert operation returned no data despite no error.");
    return { id: null, error: new Error("Insert operation returned no data.") };
  }
}

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
            bgColor: "bg-gray-50",
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
          bgColor: "bg-gray-50",
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
        bgColor: "bg-cyan-50",
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
              bgColor: "bg-rose-50",
            });
            continue;
        }

        const differentStudyDescriptions =
          await findAllDicomFilesWithDifferentStudyDescriptions(extractedFiles);

        if (differentStudyDescriptions.length === 0) {
          editCustomFileById(setFiles, files[index].id, {
            state: CustomFileStateType.noDcimFile,
            bgColor: "bg-rose-50",
          });
          continue;
        }

        const studies: Study[] = [];
        for (const study of differentStudyDescriptions) {
          editCustomFileById(setFiles, files[index].id, {
            state: CustomFileStateType.verifying,
            bgColor: "bg-cyan-50",
          });

          const { id } = await checkIfDataSetExists(
            supabase,
            userId,
            study.metadata
          );

          if (id) {
            editCustomFileById(setFiles, files[index].id, {
              state: CustomFileStateType.duplicated,
              bgColor: "bg-yellow-50",
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
              bgColor: "bg-cyan-50",
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
                bgColor: "bg-rose-50",
              });
              continue;
            }

            publicUrl = `${process.env.NEXT_PUBLIC_STORAGE_DOMAIN}/dicom/${filename}`;
          }

          editCustomFileById(setFiles, files[index].id, {
            state: CustomFileStateType.inserting,
            bgColor: "bg-cyan-50",
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
              bgColor: "bg-rose-50",
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
              bgColor: "bg-green-50",
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
          bgColor: "bg-rose-50",
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
      const differentStudyDescriptions =
        await findAllDicomFilesWithDifferentStudyDescriptions(
          nonCompressedFiles
        );

      if (differentStudyDescriptions && differentStudyDescriptions.length > 0) {
        differentStudyDescriptions.map(({ file, metadata }) => {
          setFiles((prev) => [
            ...prev,
            {
              id: uuidv4(),
              studies: [],
              file,
              patientName: metadata.patientName ?? "",
              state: CustomFileStateType.selected,
              isAvailableForR2Upload: storeByDefault,
              bgColor: "bg-gray-50",
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
            bgColor: "bg-gray-50",
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

  const onDropAccepted = () => {
    console.log("drop accepted");
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDragEnter,
    onDrop,
    onDropAccepted,
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
        transition-all  hover:outline-8 outline-cyan-50 duration-300 hover:border-cyan-200 hover:bg-white flex flex-col group items-center justify-center py-20 w-full border border-dashed rounded-2xl`}
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
          {canSwitchStoreDicom ? (
            <div className="mx-auto max-w-md mb-4 pl-3.5 flex items-center gap-2">
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
                {selectedFileCount} File{selectedFileCount === 1 ? "" : "s"} to
                Storage
              </span>
            </div>
          ) : null}
          <div className="border w-full border-gray-200 rounded-xl mx-auto max-w-md">
            <div className="flex bg-gray-100 rounded-t-xl">
              {canSwitchStoreDicom ? (
                <div className="w-18 border-gray-200 border-r text-center text-sm font-semibold py-2 first:rounded-tl-xl">
                  Store
                </div>
              ) : null}
              <div className="text-sm font-semibold px-5 py-2 first:rounded-tl-xl">
                Selected File{files.length === 1 ? "" : "s"} ({files.length})
              </div>
            </div>
            <div className="border-t border-gray-200">
              {Array.from(sortFilesByName(files)).map(
                (
                  {
                    id,
                    patientName,
                    state,
                    bgColor,
                    studies,
                    uploadPercentage,
                  },
                  index
                ) => {
                  return (
                    <div
                      key={id}
                      className={`${bgColor} last:rounded-b-xl flex text-sm first:border-0 border-t border-gray-200`}
                    >
                      {canSwitchStoreDicom ? (
                        <div
                          className={`${
                            state !== CustomFileStateType.selected
                              ? "opacity-50 pointer-events-none"
                              : ""
                          } w-18 text-center border-r border-gray-200 flex items-center justify-center py-[6px]`}
                        >
                          <label className="inline-flex items-center cursor-pointer">
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
                        </div>
                      ) : null}
                      <div className="truncate flex-1 flex items-center px-5 py-2 border-r border-gray-200">
                        <div className="truncate">{patientName}</div>
                      </div>
                      <div className="w-40 whitespace-nowrap py-1 flex-shrink-0">
                        {state === CustomFileStateType.duplicated ||
                        state === CustomFileStateType.inserted ? (
                          studies.map(({ id, state }) => (
                            <LinkInsertedOrDuplicated
                              key={id}
                              id={id}
                              userRoleId={userRoleId}
                              state={state}
                              uploadPercentage={uploadPercentage}
                              isDuplicated={
                                state === CustomFileStateType.duplicated
                              }
                            />
                          ))
                        ) : (
                          <div className="px-5 py-1.5 text-center">
                            {state}{" "}
                            {state !== CustomFileStateType.selected &&
                            state !== CustomFileStateType.processing ? (
                              <span>{uploadPercentage}%</span>
                            ) : null}
                          </div>
                        )}
                      </div>
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
