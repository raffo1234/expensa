// --- DICOM DETECTION ---
const DICOM_KNOWN_TAGS = [
  0x00080000, 0x00080008, 0x00080016, 0x00080018, 0x00080020, 0x00080060, 0x00100010, 0x00100020,
  0x0020000d, 0x0020000e,
];

const isDicomBinary = (buffer: Uint8Array): boolean => {
  if (buffer.length < 8) return false;

  // CHECK 1: Standard DICOM Part 10 (magic bytes at offset 128)
  if (buffer.length >= 132) {
    const magic = new TextDecoder().decode(buffer.slice(128, 132));
    if (magic === "DICM") return true;
  }

  // CHECK 2: Legacy DICOM — starts directly with a known tag
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const tryLegacyDicom = (littleEndian: boolean): boolean => {
    try {
      const group = view.getUint16(0, littleEndian);
      const element = view.getUint16(2, littleEndian);
      const tag = (group << 16) | element;
      return DICOM_KNOWN_TAGS.includes(tag);
    } catch {
      return false;
    }
  };

  if (tryLegacyDicom(true)) return true;
  if (tryLegacyDicom(false)) return true;

  // CHECK 3: Scan first 2KB for DICM magic (non-standard preamble)
  const scanLimit = Math.min(buffer.length - 4, 2048);
  const dicmBytes = [0x44, 0x49, 0x43, 0x4d];
  for (let i = 0; i <= scanLimit; i++) {
    if (
      buffer[i] === dicmBytes[0] &&
      buffer[i + 1] === dicmBytes[1] &&
      buffer[i + 2] === dicmBytes[2] &&
      buffer[i + 3] === dicmBytes[3]
    ) {
      return true;
    }
  }

  return false;
};

export default isDicomBinary;
