import { Bone, FieldsSectionSkeleton, LabeledFieldSkeleton } from "./Skeleton";

/** Loading state for Editar usuario (mirrors EditUserContent sections). */
export default function FallbackEditUser() {
  return (
    <div className="flex flex-col gap-4">
      {/* Header: avatar, name, role pill. */}
      <div className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:p-5 md:p-6">
        <Bone className="size-12 shrink-0 rounded-full" />
        <div>
          <Bone className="mt-1 h-5 w-48" />
          <Bone className="mt-2 h-5 w-24 rounded-full" />
        </div>
      </div>

      {/* General information, Role. */}
      <FieldsSectionSkeleton>
        <LabeledFieldSkeleton />
      </FieldsSectionSkeleton>
      <FieldsSectionSkeleton>
        <LabeledFieldSkeleton />
      </FieldsSectionSkeleton>

      {/* Project access: one checkbox per project. */}
      <FieldsSectionSkeleton>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Bone className="size-4 rounded-sm" />
              <Bone className="h-3.5 w-40" />
            </div>
          ))}
        </div>
      </FieldsSectionSkeleton>
    </div>
  );
}
