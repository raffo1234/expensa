"use client";

import { fileTypeFromBlob } from "file-type";
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

interface InsertResult {
  id: number;
  isNew: boolean;
}

async function insertDataSetToDb(
  userId: string,
  dataSet: DicomMetadata
): Promise<InsertResult | null> {
  const table = "dicom";
  const { data: existingDataArray, error: checkError } = await supabase
    .from(table)
    .select("id")
    .eq("patient_name", dataSet.patientName)
    .eq("study_date", dataSet.studyDate)
    .eq("study_description", dataSet.studyDescription)
    .eq("user_id", userId)
    .limit(1);

  if (checkError) {
    console.error("Error checking for existing record:", checkError);
    return null;
  }

  if (existingDataArray && existingDataArray.length > 0) {
    return { id: existingDataArray[0].id, isNew: false };
  } else {
    const { data: insertedDataArray, error: insertError } = await supabase
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
        },
      ])
      .select("id")
      .single();

    if (insertError) {
      console.error("Error inserting record:", insertError);
      return null;
    }

    if (insertedDataArray) {
      return { id: insertedDataArray.id, isNew: true };
    } else {
      return null;
    }
  }
}

const editFileAtIndex = (
  files: CustomFileType[],
  setFiles: React.Dispatch<React.SetStateAction<CustomFileType[]>>,
  index: number,
  state: CustomFileStateType,
  bgColor: string,
  studies: Study[] = []
) => {
  setFiles((prevFiles) => {
    if (index >= 0 && index < prevFiles.length) {
      const updatedFiles = prevFiles.map((item, fileIndex) =>
        fileIndex === index ? { ...item, state, bgColor, studies } : item
      );
      return updatedFiles;
    } else {
      console.warn(`Index ${index} is out of bounds for files array.`);
      return prevFiles;
    }
  });
};

const ImageUploader: React.FC<ImageUploaderProps> = ({
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
    for (let index = 0; index < files.length; index++) {
      setUploading(true);
      if (files[index].state !== CustomFileStateType.selected) {
        console.log(
          `Skipping file at index ${index} because it is not in the selected state.`
        );
        setUploading(false);
        continue;
      }

      const selectedFile = files[index].file;

      editFileAtIndex(
        files,
        setFiles,
        index,
        CustomFileStateType.processing,
        "bg-cyan-50"
      );
      const extension = await fileTypeFromBlob(selectedFile);
      console.warn(
        `Processing file at index ${index}: ${selectedFile.name}, type: ${extension?.ext}`
      );

      try {
        let extractedFiles: ExtractedFilesObject = {};
        switch (extension?.ext) {
          case "zip":
            extractedFiles = await processZipFile(selectedFile);
            break;
          case "rar":
            const archiveRar = await Archive.open(selectedFile);
            extractedFiles = await archiveRar.extractFiles();
            break;
          case "tar":
            const archiveTar = await Archive.open(selectedFile);
            extractedFiles = await archiveTar.extractFiles();
            break;
          case "dcm":
            extractedFiles = { [selectedFile.name]: selectedFile };
            break;
          default:
            editFileAtIndex(
              files,
              setFiles,
              index,
              CustomFileStateType.fileNotSupported,
              "bg-rose-50"
            );
            continue;
        }

        const diferentStudyDescriptions =
          await findAllDicomFilesWithDifferentStudyDescriptions(extractedFiles);

        if (diferentStudyDescriptions.length === 0) {
          editFileAtIndex(
            files,
            setFiles,
            index,
            CustomFileStateType.noDcimFile,
            "bg-rose-50"
          );
          continue;
        }

        const studies: Study[] = [];
        for (const study of diferentStudyDescriptions) {
          const insertedData = await insertDataSetToDb(userId, study.metadata);
          if (!insertedData) {
            editFileAtIndex(
              files,
              setFiles,
              index,
              CustomFileStateType.errorLoading,
              "bg-rose-50"
            );
            continue;
          }

          if (insertedData.id)
            studies.push({
              id: insertedData.id.toString(),
              state: insertedData.isNew
                ? CustomFileStateType.inserted
                : CustomFileStateType.duplicated,
            });
          editFileAtIndex(
            files,
            setFiles,
            index,
            insertedData.isNew
              ? CustomFileStateType.inserted
              : CustomFileStateType.duplicated,
            insertedData ? "bg-green-50" : "bg-yellow-50",
            studies
          );
        }
      } catch {
        editFileAtIndex(
          files,
          setFiles,
          index,
          CustomFileStateType.errorLoading,
          "bg-rose-50"
        );
      } finally {
        if (onUploadSuccess) onUploadSuccess();
        setUploading(false);
      }
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setSiDropping(true);

    const compressedMimeTypes = [
      "application/zip",
      "application/x-rar-compressed",
      "application/gzip",
      "application/x-tar",
    ];

    const nonCompressedFiles: ExtractedFilesObject = {};
    const compressedFiles: File[] = [];

    for (const file of acceptedFiles) {
      const fileTypeResult = await fileTypeFromBlob(file);
      const mimeType = fileTypeResult?.mime;
      const isCompressed = mimeType
        ? compressedMimeTypes.includes(mimeType)
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
                    <div key={index} className="truncate flex-1 px-5 py-2">
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
                              icon={`${state === CustomFileStateType.duplicated ? "solar:check-read-bold" : "solar:verified-check-bold"}`}
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
              : `Process File${files.filter((file) => file.state === CustomFileStateType.selected).length === 1 ? "" : "s"}`}
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

export default ImageUploader;
