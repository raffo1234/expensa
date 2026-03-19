import { DicomInstance } from "@/types/dicomType";

const hasDicomInstances = (instances?: DicomInstance[] | null): boolean => {
  return Array.isArray(instances) && instances.length > 0;
};

export default hasDicomInstances;
