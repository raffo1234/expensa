export default function Step({
  isActive = false,
  isInProgress = false,
  isFirst = false,
  isLast = false,
  title,
  description,
}: {
  isActive?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  isInProgress?: boolean;
  title: React.ReactNode;
  description: React.ReactNode;
}) {
  let linePositionClass = "h-full top-0";
  let mainColorClass = "bg-slate-300";
  let dotColorClass = "bg-slate-300";
  let textColorClass = "text-slate-400";
  let outerCircleClass = "bg-white border border-slate-300";
  let animateClass = "";

  if (isActive) {
    mainColorClass = "bg-cyan-400";
    dotColorClass = "bg-white";
    textColorClass = "text-slate-900";
    outerCircleClass = "bg-cyan-400";
  } else if (isInProgress) {
    mainColorClass = "bg-cyan-400";
    dotColorClass = "bg-cyan-400";
    textColorClass = "text-slate-900";
    outerCircleClass = "bg-white border border-cyan-400";
    animateClass = "animate-ping";
  }

  if (isFirst) {
    linePositionClass = "h-1/2 top-1/2";
  } else if (isLast) {
    linePositionClass = "h-1/2 top-0";
  }

  return (
    <div className="relative py-4">
      <div className={`${mainColorClass} ${linePositionClass} absolute w-[2px] z-0 left-[15px]`} />
      <div className="flex items-center gap-4 relative z-10">
        <div
          className={`${animateClass} z-0 absolute left-1 top-1/2 -translate-y-1/2 bg-cyan-400 w-6 h-6 rounded-full`}
        />
        <div
          className={`${outerCircleClass} flex-shrink-0 w-8 flex justify-center items-center h-8 rounded-full relative`}
        >
          <div className={`${dotColorClass} h-3 w-3 rounded-full`}></div>
        </div>
        <div className={textColorClass}>
          <div className="font-semibold text-base">{title}</div>
          <div>{description}</div>
        </div>
      </div>
    </div>
  );
}
