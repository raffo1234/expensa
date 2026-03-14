export default function FallbackTemplatesList() {
    return (
        Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="px-6 flex gap-3.5 items-center transition-all duration-300 py-4 border-b w-full border-gray-100">
                <div className="w-[19px] rounded-lg h-[19px] bg-gray-100" />
                <div className="rounded-lg bg-gray-100 h-5 w-1/2" />
            </div>
        ))
    )
}