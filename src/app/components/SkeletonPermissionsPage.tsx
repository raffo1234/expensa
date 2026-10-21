import { Bone } from "./Skeleton";

/** Loading state for Permisos (mirrors PermissionsPage rows). */
export default function SkeletonPermissionsPage() {
  return (
    <div className="rounded-xl border-x border-b border-gray-200 bg-white">
      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          className="flex w-full items-start gap-4 border-t border-gray-200 px-6 py-4 first:rounded-t-xl last:rounded-b-xl"
        >
          <Bone className="mt-0.5 size-[34px] flex-shrink-0 rounded-lg" />
          <div className="w-full">
            <div className="mb-2 flex items-center gap-2">
              <Bone className="h-4 w-40" />
              <Bone className="h-5 w-28 rounded-md" />
            </div>
            <Bone className="h-3.5 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
