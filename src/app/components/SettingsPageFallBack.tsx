import { FieldsSectionSkeleton, LabeledFieldSkeleton } from "./Skeleton";

/** Loading state for Global Settings (mirrors SettingsContent). */
export default function SettingsPageFallBack() {
  return (
    <FieldsSectionSkeleton>
      <LabeledFieldSkeleton />
    </FieldsSectionSkeleton>
  );
}
