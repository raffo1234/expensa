export const getAdminPropertiesUserKey = (userId: string) => {
  return `admin-properties-${userId}`;
};

export const bucketName = "dicoms";

export const adminRolesKey = "admin-roles";
export const adminPacsKey = "admin-pacs";
export const adminUsersKey = "admin-users";
export const adminActiveUsersKey = "admin-active-users";

export const ICON_SIZE = 19;

export const FIELD_TAGS: Record<string, string[]> = {
  studyInstanceUID: ["x0020000d"],
  seriesInstanceUID: ["x0020000e"], // (0020,000E) - The Series/Folder
  sopInstanceUID: ["x00080018"], // (0008,0018) - The Individual Image
  instanceNumber: ["x00200013"], // (0020,0013) - The Slice Order
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
  "emerald-50": "bg-emerald-50 border border-emerald-200",
  "gray-50": "bg-gray-50 border border-gray-200",
};

export const SWR_KEY_USER_ROLE = "user-role";
export const SWR_KEY_PERMISSIONS = "admin-permissions";

export const INPUT_CLASS =
  "w-full px-3 py-2 rounded-xl bg-white border border-slate-300 focus:outline-none focus:ring-4 focus:ring-purple-200 focus:border-purple-300 transition-all";
export const DISABLED_INPUT_CLASS =
  "w-full px-3 py-2 rounded-xl border border-gray-100 bg-gray-50 text-gray-400 font-mono cursor-not-allowed";
export const SELECT_CLASS =
  "w-full pl-3 pr-7 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 bg-white";

export const PRIMARY_BUTTON_CLASS =
  "cursor-pointer disabled:opacity-50 disabled:pointer-events-none text-white bg-slate-900 text-lg w-fit flex gap-4 items-center  font-semibold px-7 py-3.5 rounded-full hover:bg-slate-700";

export const SECONDARY_BUTTON_CLASS =
  "cursor-pointer disabled:opacity-50 disabled:pointer-events-none rounded-full border border-gray-200 gap-4 font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 px-7 py-3.5";

export const STYLED_ICON_CLASS =
  "text-purple-800 p-2 block bg-gradient-to-b lg:from-white/75 lg:to-purple-100/75 rounded-lg bg-purple-100 border border-purple-200";
