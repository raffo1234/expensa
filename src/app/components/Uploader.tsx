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
  existing: boolean;
  dicomId: number;
}

async function insertDataSetToDb(
  userId: string,
  dataSet: DicomMetadata
): Promise<InsertResult | null> {
  const table = "dicom";
  const { data: existingData, error } = await supabase
    .from(table)
    .select("id")
    .eq("patient_name", dataSet.patientName)
    .eq("study_date", dataSet.studyDate)
    .eq("study_description", dataSet.studyDescription)
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (error) {
    console.error("Error checking for existing record:", error);
    return null;
  }

  if (existingData) {
    return { existing: true, dicomId: existingData.id };
  }

  const { data, error: insertError } = await supabase
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
    .select()
    .single();

  if (insertError) {
    console.error("Error inserting record:", insertError);
    return null;
  }

  return { existing: false, dicomId: data.id };
}

enum CustomFileStateType {
  selected = "Selected",
  processing = "Processing...",
  processed = "Processed",
  duplicated = "Duplicated",
  inserted = "Inserted",
  noTag = "No Tag found",
  noDcimFile = "No DICOM file",
  fileNotSupported = "File no supported!",
  errorLoading = "Error loading!",
  errorInserting = "Error inserting!",
}

type CustomFileType = {
  file: File;
  state: CustomFileStateType;
  bgColor: string;
};

const editFileAtIndex = (
  files: CustomFileType[],
  setFiles: React.Dispatch<React.SetStateAction<CustomFileType[]>>,
  index: number,
  state: CustomFileStateType,
  bgColor: string
) => {
  setFiles((prevFiles) => {
    if (index >= 0 && index < prevFiles.length) {
      const updatedFiles = prevFiles.map((item, fileIndex) =>
        fileIndex === index ? { ...item, state, bgColor } : item
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
  const [files, setFiles] = useState<CustomFileType[]>([]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files || [];

    Array.from(selectedFiles).map((file) => {
      setFiles((prev) => [
        ...prev,
        {
          file,
          state: CustomFileStateType.selected,
          bgColor: "bg-gray-50",
        },
      ]);
    });
  };

  const handleUpload = async () => {
    setUploading(true);

    for (let index = 0; index < files.length; index++) {
      if (files[index].state !== CustomFileStateType.selected) continue;

      const selectedFile = files[index].file;

      editFileAtIndex(
        files,
        setFiles,
        index,
        CustomFileStateType.processing,
        "bg-cyan-50"
      );
      const extension = await fileTypeFromBlob(selectedFile);

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

        const dicoms =
          await findAllDicomFilesWithDifferentStudyDescriptions(extractedFiles);

        if (dicoms.length === 0) {
          editFileAtIndex(
            files,
            setFiles,
            index,
            CustomFileStateType.noDcimFile,
            "bg-rose-50"
          );
          continue;
        }

        for (const study of dicoms) {
          const data = await insertDataSetToDb(userId, study.metadata);

          if (!data) {
            editFileAtIndex(
              files,
              setFiles,
              index,
              CustomFileStateType.errorInserting,
              "bg-rose-50"
            );
            continue;
          }

          editFileAtIndex(
            files,
            setFiles,
            index,
            data?.existing
              ? CustomFileStateType.inserted
              : CustomFileStateType.duplicated,
            data?.existing ? "bg-green-50" : "bg-yellow-50"
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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    Array.from(acceptedFiles).map((file) => {
      setFiles((prev) => [
        ...prev,
        {
          file,
          state: CustomFileStateType.selected,
          bgColor: "bg-gray-50",
        },
      ]);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/octet-stream": [".rar", ".tar"],
      "application/zip": [".zip"],
      "application/x-tar": [".tar"],
      "application/x-rar-compressed": [".rar"],
    },
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
        ${uploading ? "cursor-no-drop" : "cursor-pointer"}
        transition-all  hover:outline-8 outline-cyan-50 duration-300 hover:border-cyan-200 hover:bg-white flex flex-col group items-center justify-center py-20 w-full border border-dashed rounded-2xl`}
      >
        <div className="w-11 h-11 relative mb-3">
          <Icon
            icon="solar:record-broken"
            className={`${
              uploading ? "opacity-100" : "opacity-0"
            } text-gray-500 animate-spin absolute left-0 top-0 group-hover:text-cyan-400 transition-all duration-300`}
            fontSize={42}
          />
          <Icon
            icon="solar:cloud-upload-broken"
            className={`${
              uploading ? "opacity-0" : "opacity-100"
            } text-gray-700 absolute left-0 top-0 group-hover:text-cyan-400 transition-colors duration-300`}
            fontSize={42}
          />
        </div>
        <h2 className="text-gray-400 text-sm mb-1">.zip, .rar, .tar files</h2>
        <h4 className="font-semibold">Drag and Drop your files here</h4>
        {files.length > 0 ? (
          <div className="border w-full border-gray-200 rounded-xl mt-6 max-w-md">
            <div className="text-sm font-semibold px-5 py-2 bg-gray-100 rounded-t-xl">
              Selected File{files.length === 1 ? "" : "s"} ({files.length})
            </div>
            <div className="border-t border-gray-200">
              {Array.from(files).map(({ file, state, bgColor }, index) => {
                return (
                  <div
                    key={index}
                    className={`${bgColor} last:rounded-b-xl flex text-sm items-center gap-2 first:border-0 border-t border-gray-200`}
                  >
                    <div key={index} className="truncate flex-1 px-5 py-2">
                      {file.name}
                    </div>
                    <div className="w-40 whitespace-nowrap flex-shrink-0 px-5 py-2 text-center border-l border-gray-200">
                      {state}
                    </div>
                  </div>
                );
              })}
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

      {files.length > 0 &&
      files.filter((file) => file.state === CustomFileStateType.selected)
        .length > 0 ? (
        <button
          type="button"
          className="flex mx-auto mt-4 gap-4 items-center text-white disabled:cursor-no-drop cursor-pointer font-semibold disabled:border-cyan-400 disabled:bg-cyan-400 py-3 px-10 bg-cyan-500 hover:bg-cyan-400 transition-colors duration-500 rounded-lg"
          disabled={uploading}
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

      {files.length > 0 &&
      files.filter((file) => file.state === CustomFileStateType.inserted)
        .length > 0 ? (
        <div className="flex mt-4 justify-end">
          <Link
            href="/admin/dicoms"
            className="flex items-center gap-2 cursor-pointer text-center p-3 text-cyan-400 group"
            title="View new records"
          >
            <Icon icon="solar:file-text-line-duotone" fontSize={24} />
            <span className="group-hover:underline">View Inserted Records</span>
          </Link>
        </div>
      ) : null}
    </>
  );
};

export default ImageUploader;
