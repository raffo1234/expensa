import TableSkeleton from "@/components/FormSkeleton";

export default function FallbackDicomsPage() {
    return (
        <>
            <div className="animate-pulse max-w-[480px] h-16 w-full rounded-xl bg-gray-200/40 mb-6"></div>
            <div className="flex gap-2 mb-4">
                <div className="animate-pulse h-[38px] bg-gray-200/40 flex-grow-1 rounded-full"></div>
                <div className="animate-pulse h-[38px] bg-gray-200/40 flex-grow-1 rounded-full"></div>
                <div className="animate-pulse h-[38px] bg-gray-200/40 flex-grow-1 rounded-full"></div>
                <div className="animate-pulse h-[38px] bg-gray-200/40 flex-grow-1 rounded-full"></div>
            </div>
            <div className="flex justify-end gap-1 ml-auto mb-4 max-w-[200px]">
                <div className="animate-pulse h-[34px] bg-gray-200/40 flex-grow-1 rounded-full"></div>
                <div className="animate-pulse h-[34px] bg-gray-200/40 flex-grow-1 rounded-full"></div>
                <div className="animate-pulse h-[34px] bg-gray-200/40 flex-grow-1 rounded-full"></div>
            </div>
            <div className="animate-pulse rounded-lg bg-gray-200/40 flex h-11 w-full mb-2"></div>
            <TableSkeleton rows={20} cols={7} />
        </>
    );
}