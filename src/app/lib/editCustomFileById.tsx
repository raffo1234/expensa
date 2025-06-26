import {
  CustomFileStateType,
  CustomFileType,
  Study,
} from "@/types/customFileType";
import isEqual from "lodash/isEqual";

const editCustomFileById = (
  setFiles: React.Dispatch<React.SetStateAction<CustomFileType[]>>,
  id: CustomFileType["id"],
  updates: {
    state?: CustomFileStateType;
    color?: string;
    isAvailableForR2Upload?: boolean;
    studies?: Study[];
    uploadPercentage?: number;
  }
): void => {
  setFiles((prevFiles) => {
    let fileFoundAndChanged = false;

    const updatedFiles = prevFiles.map((file) => {
      if (file.id === id) {
        const hasChanged =
          (updates.state !== undefined && file.state !== updates.state) ||
          (updates.color !== undefined && file.color !== updates.color) ||
          (updates.isAvailableForR2Upload !== undefined &&
            file.isAvailableForR2Upload !== updates.isAvailableForR2Upload) ||
          (updates.studies !== undefined &&
            !isEqual(file.studies, updates.studies)) ||
          (updates.uploadPercentage !== undefined &&
            file.uploadPercentage !== updates.uploadPercentage);

        if (hasChanged || (Object.keys(updates).length > 0 && !hasChanged)) {
          fileFoundAndChanged = true;
          return {
            ...file,
            ...updates,
          };
        }

        fileFoundAndChanged = true;
        return file;
      }
      return file;
    });

    if (!fileFoundAndChanged) {
      console.warn(`No file found with id: ${id} or no changes applied.`);
      return prevFiles;
    }

    return updatedFiles;
  });
};

export default editCustomFileById;
