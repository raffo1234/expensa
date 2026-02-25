import { DicomInstance } from "./processDicomStudyTurbo";

export function validateAndFixInstance(inst: DicomInstance): DicomInstance {
  // 1. Validar Dimensiones (Evita imágenes negras/crashes)
  if (!inst.rows || inst.rows <= 0) inst.rows = 512;
  if (!inst.columns || inst.columns <= 0) inst.columns = 512;

  // 2. Validar Geometría (Vital para mediciones)
  // PixelSpacing debe ser [number, number]. Si viene mal, fallback a 1.0mm
  if (!inst.pixel_spacing || inst.pixel_spacing.length !== 2) {
    console.warn(`SOP: ${inst.sop_instance_uid} sin PixelSpacing. Medidas desactivadas.`);
    inst.pixel_spacing = [1.0, 1.0];
  }

  // Orientation debe tener 6 valores. Fallback a Axial puro [1,0,0,0,1,0]
  if (!inst.image_orientation || inst.image_orientation.length !== 6) {
    inst.image_orientation = [1, 0, 0, 0, 1, 0];
  }

  // Position debe tener 3 valores [x, y, z]
  if (!inst.image_position || inst.image_position.length !== 3) {
    inst.image_position = [0, 0, inst.instance_number];
  }

  // 3. Validar Profundidad de Bits
  if (!inst.bits_allocated) inst.bits_allocated = 16;
  if (!inst.bits_stored) inst.bits_stored = inst.bits_allocated;
  if (inst.high_bit === undefined) inst.high_bit = inst.bits_stored - 1;

  // 4. Validar Windowing (Brillo/Contraste)
  // Si no existen, OHIF podría mostrar la imagen totalmente negra o blanca
  if (inst.window_center === undefined || isNaN(inst.window_center)) {
    inst.window_center = 40; // Estándar para tejido blando
  }
  if (inst.window_width === undefined || isNaN(inst.window_width)) {
    inst.window_width = 400;
  }

  return inst;
}
