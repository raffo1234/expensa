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
    bgColor?: string;
    isAvailableForR2Upload?: boolean;
    studies?: Study[];
  }
): void => {
  setFiles((prevFiles) => {
    let fileFoundAndChanged = false;

    const updatedFiles = prevFiles.map((file) => {
      if (file.id === id) {
        const hasChanged =
          (updates.state !== undefined && file.state !== updates.state) ||
          (updates.bgColor !== undefined && file.bgColor !== updates.bgColor) ||
          (updates.isAvailableForR2Upload !== undefined &&
            file.isAvailableForR2Upload !== updates.isAvailableForR2Upload) ||
          (updates.studies !== undefined &&
            !isEqual(file.studies, updates.studies));

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
