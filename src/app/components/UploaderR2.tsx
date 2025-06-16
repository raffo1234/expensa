"use client";

import { fileTypeFromBuffer } from "file-type";
import { Archive } from "libarchive.js";
import { supabase } from "@/lib/supabase";
import React, { useCallback, useState, type ChangeEvent } from "react";
import { Icon } from "@iconify/react";
import { useDropzone } from "react-dropzone";
import Link from "next/link";
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
import uploadSignedFile from "@/lib/uploadSignedFile";
import { SupabaseClient } from "@supabase/supabase-js";
import { sanitize } from "@/lib/sanitize";

Archive.init({
  workerUrl: "/libarchive.js/dist/worker-bundle.js",
});

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

type ImageUploaderProps = {
  userId: string;
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
        gender: dataSet.patientSex, // Assuming 'gender' is the column name
        birthday: dataSet.patientBirthDate, // Assuming 'birthday' is the column name
        institution: dataSet.institutionName, // Assuming 'institution' is the column name
        dicom_url: publicUrl,
      },
    ])
    .select("id") // Select only the ID of the newly inserted row
    .single(); // Expect only one row back

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

const editFileById = (
  setFiles: React.Dispatch<React.SetStateAction<CustomFileType[]>>,
  id: CustomFileType["id"],
  state: CustomFileStateType,
  bgColor: string,
  studies: Study[] = []
) => {
  setFiles((prevFiles) => {
    const updatedFiles = prevFiles.map((file) =>
      file.id === id ? { ...file, state, bgColor, studies } : file
    );

    if (
      !updatedFiles.some(
        (file, index) =>
          prevFiles[index]?.id === file.id &&
          (prevFiles[index]?.state !== state ||
            prevFiles[index]?.bgColor !== bgColor ||
            prevFiles[index]?.studies !== studies)
      )
    ) {
      console.warn(`No file found with id: ${id}`);
      return prevFiles;
    }

    return updatedFiles;
  });
};

const UploaderR2: React.FC<ImageUploaderProps> = ({
  userId,
  onUploadSuccess,
}) => {
  const [uploading, setUploading] = useState(false);
  const [isDropping, setSiDropping] = useState(false);
  const [files, setFiles] = useState<CustomFileType[]>([]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files || [];

    Array.from(selectedFiles).map((file) => {
      setFiles((prev) => [
        ...prev,
        {
          id: uuidv4(),
          studies: [],
          file,
          patientName: file.name,
          state: CustomFileStateType.selected,
          bgColor: "bg-gray-50",
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

      editFileById(
        setFiles,
        files[index].id,
        CustomFileStateType.processing,
        "bg-cyan-50"
      );

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
            editFileById(
              setFiles,
              files[index].id,
              CustomFileStateType.fileNotSupported,
              "bg-rose-50"
            );
            continue;
        }

        const differentStudyDescriptions =
          await findAllDicomFilesWithDifferentStudyDescriptions(extractedFiles);

        if (differentStudyDescriptions.length === 0) {
          editFileById(
            setFiles,
            files[index].id,
            CustomFileStateType.noDcimFile,
            "bg-rose-50"
          );
          continue;
        }

        const studies: Study[] = [];
        for (const study of differentStudyDescriptions) {
          editFileById(
            setFiles,
            files[index].id,
            CustomFileStateType.uploading,
            "bg-cyan-50"
          );

          const { id } = await checkIfDataSetExists(
            supabase,
            userId,
            study.metadata
          );

          if (id) {
            editFileById(
              setFiles,
              files[index].id,
              CustomFileStateType.duplicated,
              "bg-yellow-50",
              studies
            );
            studies.push({
              id: id.toString(),
              state: CustomFileStateType.duplicated,
            });
            continue;
          }

          const now = Date.now().toString();
          const urlSigned = await uploadSignedFile(selectedFile, now);
          if (!urlSigned) {
            editFileById(
              setFiles,
              files[index].id,
              CustomFileStateType.errorUploading,
              "bg-rose-50"
            );
            continue;
          }

          editFileById(
            setFiles,
            files[index].id,
            CustomFileStateType.inserting,
            "bg-cyan-50"
          );

          const filename = sanitize(`${now}_${selectedFile.name}`);
          const publicUrl = `${process.env.NEXT_PUBLIC_STORAGE_DOMAIN}/dicom/${filename}`;

          const { id: insertedId } = await insertNewDataSet(
            supabase,
            userId,
            study.metadata,
            publicUrl
          );

          if (!insertedId) {
            editFileById(
              setFiles,
              files[index].id,
              CustomFileStateType.errorInserting,
              "bg-rose-50"
            );
            continue;
          }

          if (insertedId) {
            studies.push({
              id: insertedId.toString(),
              state: CustomFileStateType.inserted,
            });

            editFileById(
              setFiles,
              files[index].id,
              CustomFileStateType.inserted,
              "bg-green-50",
              studies
            );
          }
        }
      } catch {
        editFileById(
          setFiles,
          files[index].id,
          CustomFileStateType.errorLoading,
          "bg-rose-50"
        );
      }
    }
    if (onUploadSuccess) onUploadSuccess();
    setUploading(false);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setSiDropping(true);

    const compressedMimeTypes = [
      "application/zip",
      "application/x-zip-compressed",
      "application/x-compressed", //.rar
      "application/x-rar-compressed", //.rar
    ];

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
      await findAllDicomFilesWithDifferentStudyDescriptions(nonCompressedFiles);

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
            bgColor: "bg-gray-50",
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
          bgColor: "bg-gray-50",
        },
      ]);
    });

    setSiDropping(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
  });

  return (
    <>
      <div
        {...getRootProps()}
        className={`${
          isDragActive
            ? "bg-cyan-50 border-cyan-100"
            : "bg-gray-50 border-gray-300"
        }
        ${uploading || isDropping ? "cursor-no-drop" : "cursor-pointer"}
        transition-all  hover:outline-8 outline-cyan-50 duration-300 hover:border-cyan-200 hover:bg-white flex flex-col group items-center justify-center py-20 w-full border border-dashed rounded-2xl`}
      >
        <div className="w-11 h-11 relative mb-3">
          <Icon
            icon="solar:record-broken"
            className={`${
              uploading || isDropping ? "opacity-100" : "opacity-0"
            } text-gray-500 animate-spin absolute left-0 top-0 group-hover:text-cyan-400 transition-all duration-300`}
            fontSize={42}
          />
          <Icon
            icon="solar:cloud-upload-broken"
            className={`${
              uploading || isDropping ? "opacity-0" : "opacity-100"
            } text-gray-700 absolute left-0 top-0 group-hover:text-cyan-400 transition-colors duration-300`}
            fontSize={42}
          />
        </div>
        <h2 className="text-gray-400 text-sm mb-1">.zip, .rar, .tar files</h2>
        <h4 className="font-semibold mb-5">Drag and Drop your files here</h4>
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
          disabled={uploading}
          type="file"
          className="hidden"
          multiple
        />
      </div>

      {files.length > 0 ? (
        <div className="border w-full border-gray-200 rounded-xl mt-6 mx-auto max-w-md">
          <div className="text-sm font-semibold px-5 py-2 bg-gray-100 rounded-t-xl">
            Selected File{files.length === 1 ? "" : "s"} ({files.length})
          </div>
          <div className="border-t border-gray-200">
            {Array.from(sortFilesByName(files)).map(
              ({ patientName, state, bgColor, studies }, index) => {
                return (
                  <div
                    key={index}
                    className={`${bgColor} last:rounded-b-xl flex text-sm items-center gap-2 first:border-0 border-t border-gray-200`}
                  >
                    <div className="truncate flex-1 px-5 py-2">
                      {patientName}
                    </div>
                    <div className="w-40 flex flex-col gap-1 whitespace-nowrap flex-shrink-0 text-center border-l border-gray-200">
                      {state === CustomFileStateType.duplicated ||
                      state === CustomFileStateType.inserted ? (
                        studies.map(({ id, state }) => (
                          <Link
                            key={id}
                            target="_blank"
                            href={`/admin/dicoms/${id}`}
                            className="flex gap-2 first:border-t-0 border-t border-gray-200 px-5 py-2 text-left underline hover:text-cyan-500 transition-colors duration-300 underline-offset-4 w-full justify-center"
                          >
                            <Icon
                              icon={`${
                                state === CustomFileStateType.duplicated
                                  ? "solar:check-read-bold"
                                  : "solar:verified-check-bold"
                              }`}
                              fontSize={24}
                              className="text-cyan-500"
                            />
                            <span className="flex-grow-1">{state}</span>
                          </Link>
                        ))
                      ) : (
                        <span className="px-5 py-2">{state}</span>
                      )}
                    </div>
                  </div>
                );
              }
            )}
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
        <Link
          href="/admin/dicoms"
          className="flex w-fit mt-3 mx-auto items-center gap-2 cursor-pointer text-center p-3 text-cyan-400 group"
          title="View All"
          target="_blank"
        >
          <Icon icon="solar:file-text-line-duotone" fontSize={24} />
          <span className="group-hover:underline">View All</span>
        </Link>
      ) : null}
    </>
  );
};

export default UploaderR2;
