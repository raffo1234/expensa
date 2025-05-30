import { DicomMetadata } from "../types/dicomMetadata";

interface DicomFileWithMetadata {
  file: File;
  metadata: DicomMetadata;
}

export default function sortDicomFilesByPatientName(
  filesArray: DicomFileWithMetadata[],
  order: "asc" | "desc" = "asc"
): DicomFileWithMetadata[] {
  if (!Array.isArray(filesArray)) {
    console.error("Input is not an array.");
    return filesArray;
  }

  filesArray.sort((a, b) => {
    if (!a || !a.metadata || typeof a.metadata.patientName !== "string") {
      console.warn(
        "Encountered an item with unexpected metadata structure:",
        a
      );
      return 0;
    }
    if (!b || !b.metadata || typeof b.metadata.patientName !== "string") {
      console.warn(
        "Encountered an item with unexpected metadata structure:",
        b
      );
      return 0;
    }

    const nameA = a.metadata.patientName.toLowerCase();
    const nameB = b.metadata.patientName.toLowerCase();

    let comparison = 0;
    if (nameA < nameB) {
      comparison = -1;
    } else if (nameA > nameB) {
      comparison = 1;
    }

    if (order === "desc") {
      comparison *= -1;
    }

    return comparison;
  });

  return filesArray;
}
