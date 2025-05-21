import { Icon } from "@iconify/react/dist/iconify.js";
import { useState } from "react";
import { DateRangePicker } from "react-date-range";
import { addDays } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import "../styles/react-date-range-custom.css";

interface DateRangeType {
  startDate: Date;
  endDate: Date;
  key: string;
}

export default function DateRangeButtonCalendar({
  label,
  handleDateRangeChange,
}: {
  label: string;
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

  return (
    <>
      <div
        className={`${isOpen ? "bg-gray-100 pr-9" : "pr-4 bg-cyan-400 text-white"} transition-all duration-300 w-fit font-semibold rounded-full flex items-center relative`}
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
          className={`${isOpen ? "px-4" : ""} text-sm cursor-pointer h-full py-2`}
        >
          {isOpen ? "05 mayo 2025 - 28 julio 2025" : label}
        </button>
        {isOpen ? (
          <button
            type="button"
            onClick={toggle}
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
          </div>
        </div>
      ) : null}
    </>
  );
}
