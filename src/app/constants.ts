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

export const STYLED_ICON_CLASS =
  "text-purple-800 p-1.5 block bg-gradient-to-b lg:from-white/75 lg:to-purple-100/75 rounded-lg bg-purple-100 border border-purple-200";

// ─── Inputs ───────────────────────────────────────────────────────────────────

export const INPUT_CLASS =
  "w-full pl-3 pr-3 py-2 rounded-md bg-white border border-zinc-300 text-zinc-900 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

export const SEARCH_CLASS = `${INPUT_CLASS} search-field`;

export const DISABLED_INPUT_CLASS =
  "w-full px-3 py-2 rounded-md border border-zinc-200 bg-zinc-50 text-zinc-400 text-sm font-mono cursor-not-allowed";

export const SELECT_CLASS = `${INPUT_CLASS} select-field`;

// ─── Buttons — Dashboard ──────────────────────────────────────────────────────

export const PRIMARY_BUTTON_CLASS =
  "whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:pointer-events-none inline-flex items-center gap-2 px-4 py-2 rounded-md bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors";

export const SECONDARY_BUTTON_CLASS =
  "whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:pointer-events-none inline-flex items-center gap-2 px-4 py-2 rounded-md border border-zinc-200 bg-white hover:bg-violet-50 text-zinc-700 hover:text-violet-700 text-sm font-medium transition-colors";

// ─── Buttons — XS ─────────────────────────────────────────────────────────────

export const PRIMARY_BUTTON_XS_CLASS =
  "whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:pointer-events-none inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition-colors";

export const SECONDARY_BUTTON_XS_CLASS =
  "whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:pointer-events-none inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-200 bg-white hover:bg-violet-50 text-zinc-600 hover:text-violet-700 text-xs font-medium transition-colors";

// ─── Buttons — CTA (Landing) ──────────────────────────────────────────────────

export const CTA_PRIMARY_CLASS =
  "whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:pointer-events-none inline-flex items-center gap-3 px-8 py-3 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-base font-semibold tracking-tight transition-colors";

export const CTA_SECONDARY_CLASS =
  "whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:pointer-events-none inline-flex items-center gap-3 px-8 py-3 rounded-full border border-violet-200 bg-white hover:bg-violet-50 text-violet-700 hover:text-violet-800 text-base font-semibold tracking-tight transition-colors";
