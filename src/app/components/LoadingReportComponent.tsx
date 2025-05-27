export default function LoadingReportComponent() {
  return (
    <div className="animate-pulse opacity-50">
      <div className="h-[21px] w-26 mb-8 rounded-lg bg-gray-200"></div>
      <div className="flex  mb-6 w-full justify-between">
        <div className="flex items-center gap-2 ">
          <div className="h-[50px] w-[100px] rounded-xl bg-gray-200"></div>
          <div className="h-[50px] w-[100px] rounded-xl bg-gray-200"></div>
        </div>
        <div className="h-[40px] w-[100px] rounded-full bg-gray-200"></div>
      </div>
      <div className="bg-gray-200 w-full h-200"></div>
    </div>
  );
}
