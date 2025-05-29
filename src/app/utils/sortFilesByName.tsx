interface FileObject {
  name: string;
  lastModified?: number;
  size?: number;
  type?: string;
}

interface ArrayEntry {
  bgColor: string;
  state: string;
  patientName: string;
  studies: { id: string; state: string }[];
  file: FileObject;
}

export default function sortFilesByName(
  filesArray: ArrayEntry[]
): ArrayEntry[] {
  if (!Array.isArray(filesArray)) {
    console.error("Input is not an array.");
    return filesArray;
  }

  filesArray.sort((a, b) => {
    if (!a || !a.file || typeof a.file.name !== "string") {
      console.warn("Encountered an item with unexpected structure:", a);

      return 0;
    }
    if (!b || !b.file || typeof b.file.name !== "string") {
      console.warn("Encountered an item with unexpected structure:", b);

      return 0;
    }

    const nameA = a.file.name.toLowerCase();
    const nameB = b.file.name.toLowerCase();

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
