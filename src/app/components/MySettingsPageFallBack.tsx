import { Bone, FieldsSectionSkeleton } from "./Skeleton";

/** Loading state for My settings (mirrors MySettings: a switch and its label). */
export default function MySettingsPageFallBack() {
  return (
    <FieldsSectionSkeleton>
      <div className="flex items-center gap-3">
        <Bone className="h-5.5 w-11 rounded-full" />
        <Bone className="h-3.5 w-36" />
      </div>
    </FieldsSectionSkeleton>
  );
}
