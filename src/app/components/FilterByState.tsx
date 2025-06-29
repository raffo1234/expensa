import { DicomStateEnum } from "@/enums/dicomStateEnum";

const filterByState = (
  state: DicomStateEnum,
  filteredByState: string,
  setFilteredByState: React.Dispatch<
    React.SetStateAction<DicomStateEnum | null>
  >
) => {
  if (filteredByState === state) {
    setFilteredByState(null);
    localStorage.removeItem("dicomStateFilter");
  } else {
    setFilteredByState(state);
    localStorage.setItem("dicomStateFilter", state);
  }
};

export default function FilterByState({
  filteredByState,
  setFilteredByState,
}: {
  filteredByState: string;
  setFilteredByState: React.Dispatch<
    React.SetStateAction<DicomStateEnum | null>
  >;
}) {
  return (
    <div className="flex rounded-full w-full items-center">
      {Object.values(DicomStateEnum).map((state, index) => (
        <button
          key={state}
          title={state}
          onClick={() =>
            filterByState(state, filteredByState, setFilteredByState)
          }
          className={`
                        ${state === filteredByState ? "border-3 border-slate-50" : ""}
                        ${index === 0 ? "rounded-l-full" : ""}
                        ${
                          index === Object.values(DicomStateEnum).length - 1
                            ? "rounded-r-full"
                            : ""
                        }
                        cursor-pointer h-[36px] min-w-10 flex-grow-1
                        ${state === DicomStateEnum.NEW ? "bg-white" : ""}
                        ${state === DicomStateEnum.VIEWED ? "bg-yellow-300" : ""}
                        ${state === DicomStateEnum.DRAFT ? "bg-orange-300" : ""}
                        ${state === DicomStateEnum.COMPLETED ? "bg-cyan-300" : ""}`}
        ></button>
      ))}
    </div>
  );
}
