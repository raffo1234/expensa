import { Icon } from "@iconify/react/dist/iconify.js";
import { useState } from "react";
import { DateRangePicker } from "react-date-range";
import { format, formatISO } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import "../styles/react-date-range-custom.css";
import { toZonedTime } from "date-fns-tz";

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
  console.log("date range", dateRange);
  const timeZone = "America/Lima"; // Set timezone to Peru
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

  return (
    <>
      <div
        className={`${dateRange ? "bg-gray-100 pr-9" : "pr-4 bg-cyan-400 text-white"} transition-all duration-300 w-fit font-semibold rounded-full flex items-center relative`}
      >
        <button
          onClick={toggle}
          type="button"
          className="cursor-pointer text-sm px-4 py-2 rounded-full bg-cyan-400"
        >
          <Icon
            icon="solar:calendar-linear"
            fontSize={20}
            className="text-white"
          ></Icon>
        </button>
        <button
          onClick={toggle}
          type="button"
          className={`${isOpen ? "px-4" : ""} text-sm cursor-pointer h-full`}
        >
          {dateRange ? (
            <div className="flex items-center gap-1 px-1">
              <div className="py-1 px-2 rounded-full bg-gray-200">
                {formattedStart}
              </div>
              <span>-</span>
              <div className="py-1 px-2 rounded-full bg-gray-200">
                {formattedEnd}
              </div>
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
            className="cursor-pointer bg-cyan-400 p-1 rounded-full text-white right-0 absolute top-1/2 -translate-y-1/2"
          >
            <Icon
              icon="material-symbols-light:close-rounded"
              fontSize={28}
            ></Icon>
          </button>
        ) : null}
      </div>
      {isOpen ? (
        <div
          onClick={onCloseOutside}
          className="bg-[rgb(255,255,255,.9)] fixed top-0 left-0 w-full h-lvh z-10 flex items-start pt-30 justify-center"
        >
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <DateRangePicker
              onChange={(item) => {
                console.log(item);
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
      ) : null}
    </>
  );
}
