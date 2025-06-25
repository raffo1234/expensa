import { CustomFile, CustomFileState } from "@/components/AttachFiles";

const editFileById = (
  setFiles: React.Dispatch<React.SetStateAction<CustomFile[]>>,
  id: CustomFile["id"],
  updates: {
    state?: CustomFileState;
    uploadPercentage?: number;
    dbId?: string;
    publicUrl?: string;
  }
): void => {
  setFiles((prevFiles) => {
    let found = false;

    const updatedFiles = prevFiles.map((file) => {
      if (file.id !== id) return file;

      found = true;
      return {
        ...file,
        ...updates,
      };
    });

    if (!found) {
      console.warn(`editFileById: No file found with id ${id}`);
    }

    return updatedFiles;
  });
};

export default editFileById;
