import { ExtractedFilesObject } from "./decompress";
import { fileTypeFromBlob } from "file-type";
import dicomParser from "dicom-parser"; // Or dcmjs, etc.

async function isDicomFile(file: File): Promise<boolean> {
  try {
    const extension = await fileTypeFromBlob(file);
    if (extension && extension.ext === "dcm") {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error reading file:", error);
    return false;
  }
}

async function getStudyDescription(file: File): Promise<string | undefined> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const byteArray = new Uint8Array(arrayBuffer);
    if (
      byteArray.length >= 132 &&
      byteArray[128] === 0x44 &&
      byteArray[129] === 0x49 &&
      byteArray[130] === 0x43 &&
      byteArray[131] === 0x4d
    ) {
      const dataSet = dicomParser.parseDicom(byteArray);
      return dataSet.string("x00081030");
    }
    return undefined;
  } catch (error) {
    console.error("Error parsing DICOM file:", error);
    return undefined;
  }
}

async function findFirstDcmFileRecursive(
  item: File | ExtractedFilesObject
): Promise<File | undefined> {
  if (item instanceof File) {
    if (item.name.toLowerCase() === "dicomdir") {
      return undefined; // Ignore files named "DICOMDIR"
    }
    const isValidDicom = await isDicomFile(item);
    console.log("isValidDicom", isValidDicom);
    if (isValidDicom) {
      return item;
    }
  } else if (typeof item === "object" && item !== null) {
    for (const itemName in item) {
      if (Object.prototype.hasOwnProperty.call(item, itemName)) {
        const nestedItem = item[itemName];

        const foundFile = await findFirstDcmFileRecursive(nestedItem);

        if (foundFile) {
          return foundFile;
        }
      }
    }
  }

  return undefined;
}

export async function findFirstLevelDicomFilesWithDifferentStudyDescriptions(
  extractedFilesObject: ExtractedFilesObject,
  minFolderCount: number = 2 // Make the minimum folder count a parameter
): Promise<File[] | undefined> {
  const currentLevelFolders: ExtractedFilesObject[] = [];
  const dicomFiles: (File | undefined)[] = []; // To store the corresponding DICOM files
  const nextLevelObjects: ExtractedFilesObject[] = []; // To store objects for the next level of search

  // Collect first-level folders and identify next levels for search
  for (const key in extractedFilesObject) {
    if (Object.prototype.hasOwnProperty.call(extractedFilesObject, key)) {
      const item = extractedFilesObject[key];
      if (
        typeof item === "object" &&
        item !== null &&
        !(item instanceof File)
      ) {
        currentLevelFolders.push(item as ExtractedFilesObject);
        dicomFiles.push(await findFirstDcmFileRecursive(item));
        nextLevelObjects.push(item as ExtractedFilesObject);
      }
    }
  }

  // If enough folders at this level, check study descriptions
  if (currentLevelFolders.length >= minFolderCount) {
    const studyDescriptions: (string | undefined)[] = await Promise.all(
      dicomFiles.map(async (dicomFile) => {
        return dicomFile ? await getStudyDescription(dicomFile) : undefined;
      })
    );

    const validDescriptionsWithIndex = studyDescriptions
      .map((desc, index) => ({ desc, index }))
      .filter(({ desc }) => desc !== undefined);

    const uniqueDescriptions = [
      ...new Set(validDescriptionsWithIndex.map(({ desc }) => desc)),
    ];

    if (
      uniqueDescriptions.length === currentLevelFolders.length &&
      currentLevelFolders.length > 1
    ) {
      // Return the DICOM files where study descriptions are different
      return validDescriptionsWithIndex
        .map(({ index }) => dicomFiles[index]!)
        .filter((file) => file !== undefined) as File[];
    }
  }

  // If criteria not met at this level, recursively search in subfolders
  for (const item of nextLevelObjects) {
    const result = await findFirstLevelDicomFilesWithDifferentStudyDescriptions(
      item as ExtractedFilesObject,
      minFolderCount
    );
    if (result) {
      return result;
    }
  }

  return undefined;
}
