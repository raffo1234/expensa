import { isDicomFile } from "./isDicomFile";
import dicomParser from "dicom-parser";

export async function getFirstDicomPatientNameFromFiles(
    files: File[] | FileList
  ): Promise<string | undefined> {
    const fileArray = Array.from(files);
  
    for (const file of fileArray) {
      const isDicom = await isDicomFile(file);
      if (!isDicom) {
        console.warn(`⚠️ Skipping non-DICOM file: ${file.name}`);
        continue;
      }
  
      try {
        const arrayBuffer = await file.arrayBuffer();
        const byteArray = new Uint8Array(arrayBuffer);
        const dataSet = dicomParser.parseDicom(byteArray);
  
        const patientName = dataSet.string("x00100010")?.trim();
        if (patientName) return patientName;
      } catch (err) {
        console.warn(`⚠️ Failed to parse DICOM file: ${file.name}`, err);
      }
    }
  
    return undefined;
  }