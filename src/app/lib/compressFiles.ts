import JSZip from "jszip";

export const compressFiles = async (files: File[]): Promise<File | null> => {
  if (!files || files.length === 0) {
    console.warn('No files provided for compression.');
    return null;
  }

  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.name, file);
  }

  try {
    const compressedBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 9, 
      },
    });
    const compressedFile = new File([compressedBlob], 'Folder_to_zip.zip', { type: 'application/zip' });
    return compressedFile;
  } catch (error) {
    console.error('Error during ZIP file generation:', error);
    return null;
  }
};