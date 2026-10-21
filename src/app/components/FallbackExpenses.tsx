import FormSection from "./FormSection";
import { EXPENSE_COLUMNS } from "@/lib/tableColumns";
import {
  Bone,
  HeaderLinksSkeleton,
  ListPageSkeleton,
  SearchRowSkeleton,
  TotalHeaderSkeleton,
} from "./Skeleton";

/** Loading state for a project's expenses list (mirrors ExpensesClient). */
export default function FallbackExpenses() {
  return (
    <FormSection
      title={<Bone className="h-4.5 w-40" />}
      backUrl="/admin/workspaces"
      actions={<HeaderLinksSkeleton count={3} />}
    >
      <ListPageSkeleton
        columns={EXPENSE_COLUMNS}
        controls={
          <>
            <TotalHeaderSkeleton />
            <SearchRowSkeleton inputs={["sm:w-28", "sm:w-36"]} />
          </>
        }
      />
    </FormSection>
  );
}
