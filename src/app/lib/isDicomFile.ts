import dicomParser from "dicom-parser";

export async function isDicomFile(file: File): Promise<boolean> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const byteArray = new Uint8Array(arrayBuffer);

    // Verifica el header "DICM" en offset 128
    const hasDICMHeader =
      byteArray.length >= 132 &&
      byteArray[128] === 0x44 && // 'D'
      byteArray[129] === 0x49 && // 'I'
      byteArray[130] === 0x43 && // 'C'
      byteArray[131] === 0x4d;   // 'M'

    if (hasDICMHeader) return true;

    
    const dataSet = dicomParser.parseDicom(byteArray, { untilTag: "x00080020" });
    return !!dataSet.elements["x00080020"];
  } catch {
    return false;
  }
}
