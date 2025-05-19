"use client";

import { v4 as uuidv4 } from "uuid";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useDropzone } from "react-dropzone";
import { ChangeEvent, useState } from "react";

export default function UploaderTemplateImageUploader({
  templateImageUrl,
  templateId,
  userId,
  onUploadSuccess,
  fileNamePrefix,
  previewImageWidth = "100%",
}: {
  templateImageUrl: string | null;
  templateId: string;
  userId: string;
  fileNamePrefix: string;
  previewImageWidth?: string;
  onUploadSuccess?: (publicUrl: string) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "image/*": [],
    },
    disabled: isLoading,
    maxFiles: 1,
  });

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
    templateId: string
  ) => {
    setIsLoading(true);
    const selectedFile = event.target.files?.[0] || null;
    const fileExt = selectedFile?.name.split(".").pop();
    const fileName = `${fileNamePrefix}_${templateId}_${uuidv4()}.${fileExt}`;
    const folderPath = `template_user_${userId}/${templateId}/${fileNamePrefix}`;
    const filePath = `${folderPath}/${fileName}`;
    const bucketName = "dicoms";

    if (!selectedFile) {
      setIsLoading(false);
      throw new Error("Please select an image file.");
    }

    if (templateImageUrl) {
      const { data: files } = await supabase.storage
        .from(bucketName)
        .list(folderPath);

      if (!files || files.length === 0) {
        console.log("Folder is already empty or does not exist.");
      }

      if (files && files.length > 0) {
        const filesToRemove =
          files?.map((file) => `${folderPath}/${file.name}`) || [];

        const { data: removeData, error: removeError } = await supabase.storage
          .from(bucketName)
          .remove(filesToRemove);

        if (removeError) {
          setIsLoading(false);
          console.error("Error removing files:", removeError.message);
        } else {
          console.log("Files removed successfully:", removeData);
          console.log("The folder will disappear automatically once empty.");
        }
      }
    }

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, selectedFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      setIsLoading(false);
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    if (!publicUrl) {
      setIsLoading(false);
      throw new Error("Could not get public URL after upload.");
    }

    if (onUploadSuccess) onUploadSuccess(publicUrl);
    setIsLoading(false);
  };

  return (
    <div className="w-full flex flex-col gap-4 items-center">
      <div
        {...getRootProps()}
        className={`${isLoading ? "pointer-none animate-pulse" : "cursor-pointer"} flex flex-col group items-center justify-center py-9 w-full border border-gray-300 border-dashed rounded-2xl bg-gray-50`}
      >
        <div className="relative h-11 mb-3 w-11">
          <Icon
            icon="solar:cloud-upload-broken"
            className={`${isLoading ? "invisible opacity-0" : "visible opacity-100"} text-gray-700 absolute top-0 left-1/2 -translate-x-1/2 group-hover:text-cyan-400 transition-all duration-300`}
            fontSize={42}
          />
          <Icon
            icon="solar:traffic-line-duotone"
            className={`${isLoading ? "visible opacity-100" : "invisible opacity-0"} transition-all duration-300 text-gray-700 absolute top-0 animate-spin left-1/2 -translate-x-1/2`}
            fontSize={42}
          />
        </div>
        {templateImageUrl ? (
          <div className="text-green-600 text-sm mb-1">
            Replace current image
          </div>
        ) : null}
        <h2 className="text-gray-400 text-sm mb-1">
          Image file, less than 100KB
        </h2>
        <h4 className="font-semibold">Drag and Drop your file here</h4>
        <input
          id="dropzone-file"
          {...getInputProps()}
          onChange={(event) => handleFileChange(event, templateId)}
          type="file"
          disabled={isLoading}
          className="hidden"
        />
      </div>
      {templateImageUrl ? (
        <div className="flex justify-end w-full">
          <Image
            src={templateImageUrl}
            alt={templateImageUrl}
            width={300}
            height={300}
            className="h-auto"
            style={{ width: previewImageWidth }}
          />
        </div>
      ) : null}
    </div>
  );
}
