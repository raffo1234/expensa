export interface DicomImageData {
  // 1. Foreign Key a la tabla 'dicom' (estudio)
  dicomId: string; // Enlace al registro del estudio en la tabla 'dicom'
  studyInstanceUID: string;
  // Identificadores de Instancia y Serie
  // 2. Series Instance UID (0020,000E) - Identificador único de la serie
  seriesInstanceUID: string;
  // 3. SOP Instance UID (0008,0018) - Identificador único de la instancia (imagen)
  sopInstanceUID: string;
  // 4. Instance Number (0020,0013) - Número secuencial de la imagen dentro de la serie
  instanceNumber: string;
  // 5. Series Number (0020,0011) - Número de la serie dentro del estudio
  seriesNumber?: string;

  // Información de la URL/Ruta
  // 6. Image URL - URL pública de la imagen DICOM en el almacenamiento (e.g., R2)
  imageUrl: string;
  // 7. File Path In Archive - Ruta del archivo dentro de un ZIP/RAR si aplica
  filePathInArchive?: string;

  // Metadatos de Adquisición
  // 8. Acquisition Date (0008,0022) - Fecha de adquisición de la imagen
  acquisitionDate?: string; // Formato YYYYMMDD
  // 9. Acquisition Time (0008,0032) - Hora de adquisición de la imagen
  acquisitionTime?: string; // Formato HHMMSS.frac

  // Metadatos de la Imagen
  // 10. Image Type (0008,0008) - Tipo de imagen (ej. ORIGINAL\PRIMARY\AXIAL)
  imageType?: string[];
  // 11. Rows (0028,0010) - Número de filas de píxeles
  rows?: string;
  // 12. Columns (0028,0011) - Número de columnas de píxeles
  columns?: string;
  // 13. Pixel Spacing (0028,0030) - Espaciado entre píxeles en mm [fila, columna]
  pixelSpacing?: string[];
  // 14. Bits Stored (0028,0101) - Número de bits almacenados por muestra de píxel
  bitsStored?: string;
  // 15. High Bit (0028,0102) - Bit más significativo para los datos de píxel
  highBit?: string;
  // 16. Pixel Representation (0028,0103) - 0 para enteros sin signo, 1 para enteros con signo
  pixelRepresentation?: string;
  // 17. Photometric Interpretation (0028,0004) - Significado de los datos de píxel (ej. MONOCHROME2)
  photometricInterpretation?: string;

  // Ventana (Windowing)
  // 18. Window Center (0028,1050) - Valor central de la ventana para visualización
  windowCenter?: string;
  // 19. Window Width (0028,1051) - Ancho de la ventana para visualización
  windowWidth?: string;

  // Metadatos de la Serie
  // 20. Series Description (0008,103E) - Descripción de la serie
  seriesDescription?: string;
  // 21. Body Part Examined (0018,0015) - Parte del cuerpo examinada
  bodyPartExamined?: string;
  // 22. Protocol Name (0018,1030) - Nombre del protocolo de la serie
  protocolName?: string;

  // Metadatos de Posición del Paciente/Imagen
  // 23. Patient Position (0018,5100) - Posición del paciente durante la adquisición
  patientPosition?: string;
  // 24. Image Orientation (Patient) (0020,0037) - Orientación de la imagen en relación con el paciente
  imageOrientationPatient?: string[]; // Array de 6 floats
  // 25. Image Position (Patient) (0020,0032) - Posición de la primera píxel en relación con el paciente
  imagePositionPatient?: string[]; // Array de 3 floats

  // Metadatos adicionales (ej. de rendimiento o detalles técnicos)
  // 26. KVP (0018,0060) - Pico de kilovoltaje del tubo de rayos X
  kvp?: string;
  // 27. X-ray Tube Current (0018,1150) - Corriente del tubo de rayos X en mA
  xRayTubeCurrent?: string;
  // 28. Exposure Time (0018,1152) - Tiempo de exposición en ms
  exposureTime?: string;
  // 29. Gantry/Detector Tilt (0018,1120) - Inclinación del gantry o detector
  gantryDetectorTilt?: string;
}

export interface InsertImageOperationResult {
  id: string | null;
  error: Error | null;
}
