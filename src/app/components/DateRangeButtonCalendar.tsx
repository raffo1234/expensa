import { Icon } from "@iconify/react/dist/iconify.js";
import { useEffect, useState } from "react";
import { DateRangePicker } from "react-date-range";
import { format, formatISO } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import "../styles/react-date-range-custom.css";
import { toZonedTime } from "date-fns-tz";
import { ICON_SIZE } from "@/constants";

interface DateRangeType {
  startDate: Date;
  endDate: Date;
  key: string;
}

export default function DateRangeButtonCalendar({
  label,
  dateRange,
  handleDateRangeChange,
}: {
  label: string;
  dateRange: DateRangeType | null;
  handleDateRangeChange: (newRange: DateRangeType | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState([
    {
      startDate: new Date(),
      endDate: new Date(),
      key: "selection",
    },
  ]);

  const toggle = () => setIsOpen((prev) => !prev);

  const onCloseOutside = (event: React.MouseEvent<HTMLElement>) => {
    if (!isOpen) return;
    if (event.target === event.currentTarget) {
      setIsOpen(false);
    }
  };

  const timeZone = "America/Lima";
  const zonedStart = dateRange?.startDate
    ? toZonedTime(dateRange?.startDate, timeZone)
    : null;

  const zonedEnd = dateRange?.endDate
    ? toZonedTime(dateRange?.endDate, timeZone)
    : null;

  const start = zonedStart ? formatISO(zonedStart) : null;
  const formattedStart = start ? format(new Date(start), "dd-MM-yyyy") : null;
  const end = zonedEnd ? formatISO(zonedEnd) : null;
  const formattedEnd = end ? format(new Date(end), "dd-MM-yyyy") : null;

  useEffect(() => {
    const app = document.getElementById("admin");
    if (isOpen) {
      app?.classList.add("overflow-hidden");
    } else {
      app?.classList.remove("overflow-hidden");
    }
  }, [isOpen]);

  return (
    <>
      <div
        className={`${dateRange ? "bg-gray-100 pr-9" : "bg-cyan-400 text-white"} flex-shrink-0 rounded-full flex items-center relative`}
      >
        <button
          onClick={toggle}
          type="button"
          className={`${dateRange ? "px-3" : "pl-6 pr-2"} cursor-pointer text-white text-sm py-2 rounded-full bg-cyan-400`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={ICON_SIZE}
            height={ICON_SIZE}
            viewBox="0 0 24 24"
          >
            <g fill="none">
              <path
                stroke="currentColor"
                strokeWidth="1.5"
                d="M2 12c0-3.771 0-5.657 1.172-6.828S6.229 4 10 4h4c3.771 0 5.657 0 6.828 1.172S22 8.229 22 12v2c0 3.771 0 5.657-1.172 6.828S17.771 22 14 22h-4c-3.771 0-5.657 0-6.828-1.172S2 17.771 2 14z"
              />
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.5"
                d="M7 4V2.5M17 4V2.5M2.5 9h19"
              />
              <path
                fill="currentColor"
                d="M18 17a1 1 0 1 1-2 0a1 1 0 0 1 2 0m0-4a1 1 0 1 1-2 0a1 1 0 0 1 2 0m-5 4a1 1 0 1 1-2 0a1 1 0 0 1 2 0m0-4a1 1 0 1 1-2 0a1 1 0 0 1 2 0m-5 4a1 1 0 1 1-2 0a1 1 0 0 1 2 0m0-4a1 1 0 1 1-2 0a1 1 0 0 1 2 0"
              />
            </g>
          </svg>
        </button>
        <button
          onClick={toggle}
          type="button"
          className={`${dateRange ? "" : "pr-6"} py-1 cursor-pointer h-full`}
        >
          {dateRange ? (
            <div className="flex items-center gap-1 px-1 text-xs">
              <div className="py-1 px-2 rounded-full bg-gray-200">
                {formattedStart}
              </div>
              {formattedStart !== formattedEnd ? (
                <>
                  <span>-</span>
                  <div className="py-1 px-2 rounded-full bg-gray-200">
                    {formattedEnd}
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            label
          )}
        </button>
        {dateRange ? (
          <button
            type="button"
            onClick={() => {
              setState([
                {
                  startDate: new Date(),
                  endDate: new Date(),
                  key: "selection",
                },
              ]);
              handleDateRangeChange(null);
            }}
            className="cursor-pointer bg-cyan-400 p-2 rounded-full text-white right-0 absolute top-1/2 -translate-y-1/2"
          >
            <Icon
              icon="material-symbols-light:close-rounded"
              fontSize={ICON_SIZE}
            ></Icon>
          </button>
        ) : null}
      </div>
      <div
        onClick={onCloseOutside}
        className={`${
          isOpen ? "bg-opacity-30 visible" : "opacity-0 bg-opacity-0 invisible"
        } bg-[rgb(255,255,255,.9)] transition-all duration-300 overflow-auto fixed top-0 left-0 w-full h-lvh z-10 flex items-start pb-10 pt-30 justify-center`}
      >
        <div
          className={`
           ${isOpen ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-80"}
          bg-white rounded-2xl shadow-lg p-8 overflow-auto transition-all duration-300`}
        >
          <DateRangePicker
            onChange={(item) => {
              // @ts-expect-error: Unreachable code error
              setState([item.selection]);

              if (item.selection.startDate && item.selection.endDate) {
                handleDateRangeChange({
                  startDate: item.selection.startDate,
                  endDate: item.selection.endDate,
                  key: "selection",
                });
              }
            }}
            moveRangeOnFirstSelection={false}
            months={2}
            ranges={state}
            direction="horizontal"
          />
          <button
            onClick={toggle}
            type="button"
            title="Done"
            className="cursor-pointer mx-auto px-6 text-white justify-center py-2 rounded-full bg-black flex gap-2 items-center w-fit"
          >
            <span>Done</span>
          </button>
        </div>
      </div>
    </>
  );
}
