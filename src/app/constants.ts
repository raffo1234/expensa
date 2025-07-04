export const getAdminPropertiesUserKey = (userId: string) => {
  return `admin-properties-${userId}`;
};

export const bucketName = "dicoms";

export const adminRolesKey = "admin-roles";
export const adminPacsKey = "admin-pacs";
export const adminUsersKey = "admin-users";

export const ICON_SIZE = 19;

export const FIELD_TAGS: Record<string, string[]> = {
  studyInstanceUID: ["x0020000d"],
  patientName: ["x00100010"],
  patientId: ["x70051024", "x00100020"],
  patientAge: ["x00101010"],
  studyDescription: ["x00081030", "x00181030", "x7005100d"],
  modality: ["x00080060"],
  studyDate: ["x00080020"],
  patientSex: ["x00100040"],
  patientBirthDate: ["x00100030"],
  institutionName: ["x00080080"],
};

export const colorClassMap: Record<string, string> = {
  "rose-50": "bg-rose-50 border border-rose-200",
  white: "bg-white border border-gray-300",
  "green-50": "bg-green-50 border border-green-200",
  "yellow-50": "bg-yellow-50 border border-yellow-300",
  "cyan-50": "bg-cyan-50 border border-cyan-200",
};
