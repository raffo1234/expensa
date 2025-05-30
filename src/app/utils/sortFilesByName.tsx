import { CustomFileType } from "@/types/customFileType";

export default function sortFilesByName(
  filesArray: CustomFileType[]
): CustomFileType[] {
  if (!Array.isArray(filesArray)) {
    console.error("Input is not an array.");
    return filesArray;
  }

  filesArray.sort((a, b) => {
    if (!a || !a.file || typeof a.patientName !== "string") {
      console.warn("Encountered an item with unexpected structure:", a);

      return 0;
    }
    if (!b || !b.file || typeof b.patientName !== "string") {
      console.warn("Encountered an item with unexpected structure:", b);

      return 0;
    }

    const nameA = a.patientName.toLowerCase();
    const nameB = b.patientName.toLowerCase();

    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }
    return 0;
  });

  return filesArray;
}
