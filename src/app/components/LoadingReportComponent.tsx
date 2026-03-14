export function GadgetReportSkeleton() {
  return (
    <div className="flex gap-2 mb-4 w-full">
      <div className="h-[26px] max-w-[111px] w-full rounded-lg bg-gray-200/70 animate-pulse"></div>
      <div className="h-[26px] max-w-[111px] w-full rounded-lg bg-gray-200/70 animate-pulse"></div>
    </div>
  )
}

export function ListTemplatesSkeleton() {
  return (
    <div className="flex gap-2">
      <div className="w-[104px] h-[38px] bg-gray-200/70 rounded-lg animate-pulse"></div>
      <div className="w-[104px] h-[38px] bg-gray-200/70 rounded-lg animate-pulse"></div>
      <div className="w-[104px] h-[38px] bg-gray-200/70 rounded-lg animate-pulse"></div>
      <div className="w-[104px] h-[38px] bg-gray-200/70 rounded-lg animate-pulse"></div>
      <div className="w-[104px] h-[38px] bg-gray-200/70 rounded-lg animate-pulse"></div>
    </div>
  )
}

export function AttachmentsSkeleton() {
  return (
    <div className="mt-4 flex gap-3">
      <div className="rounded-full h-9 w-[155px] bg-gray-200/70 animate-pulse"></div>
      <div className="rounded-full h-9 w-10 bg-gray-200/70 animate-pulse"></div>
    </div>
  )
}

export default function LoadingReportComponent() {
  return (
    <>
      <GadgetReportSkeleton />
      <ListTemplatesSkeleton />
      <AttachmentsSkeleton />
      <div className="mt-4 mb-4 flex justify-between">
        <div className="w-[37px] h-[37px] rounded-full bg-gray-200/70 animate-pulse"></div>
        <div className="flex gap-2">
          <div className="w-[37px] h-[37px] rounded-full bg-gray-200/70 animate-pulse"></div>
          <div className="w-[37px] h-[37px] rounded-full bg-gray-200/70 animate-pulse"></div>
        </div>
      </div>
      <div className="flex justify-end mb-4">
        <div className="flex gap-2">
          <div className="w-[93px] h-[38px] bg-gray-200/70 animate-pulse rounded-full"></div>
          <div className="w-[129px] h-[38px] bg-gray-200/70 animate-pulse rounded-full"></div>
        </div>
      </div>
      <div className="bg-gray-200/70 w-full h-200"></div>
    </>
  );
}
