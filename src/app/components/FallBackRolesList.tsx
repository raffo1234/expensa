import { Bone } from "./Skeleton";

/** Loading state for the roles list and a role's permissions (mirrors RoleItem rows). */
export default function FallBackRolesList() {
  return Array.from({ length: 3 }, (_, i) => (
    <div
      key={i}
      className="flex h-[52px] w-full items-center gap-3.5 border-t border-slate-200 px-6 py-4 first:border-t-0"
    >
      <Bone className="size-4 rounded-sm" />
      <Bone className="h-4 w-1/3" />
    </div>
  ));
}
