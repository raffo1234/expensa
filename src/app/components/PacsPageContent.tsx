"use client";

import { format, formatISO } from "date-fns";
import DateRangeButtonCalendar from "./DateRangeButtonCalendar";
import extractAgeWidthUnit from "@/lib/extractAgeWithUnit";
import useCheckPermission from "@/hooks/useCheckPermission";
import { Permissions } from "@/types/propertyState";
import { Icon } from "@iconify/react/dist/iconify.js";
import useCheckboxSelection from "@/hooks/useCheckboxSelection";
import Link from "next/link";
import { useCallback, useState } from "react";
import PacsList from "./PacsList";
import { PacType } from "@/types/PacType";
import getAgeFromYYYYMMDD from "@/lib/getAgeFromYYYYMMDD";
import { DicomType } from "@/types/dicomType";
import upsertStudy from "@/lib/upsertStudy";
import { toZonedTime } from "date-fns-tz";
import formatDate from "@/lib/formatDate";
import { Modalities } from "@/enums/modalities";
import { ICON_SIZE } from "@/constants";

interface TableRowType {
  id: string;
}

type Study = {
  dicom: DicomType;
  dicomId: string;
  state: StudyState;
};

enum StudyState {
  Selected = "Selected",
  Loading = "Loading",
  Inserted = "Inserted",
  Duplicated = "Duplicated",
}

interface DateRangeType {
  startDate: Date;
  endDate: Date;
  key: string;
}

export default function PacsPageContent({
  userId,
  userRoleId,
}: {
  userRoleId: string;
  userId: string | undefined;
}) {
  const now = new Date();

  const [studyDateRange, setStudyDateRange] = useState<DateRangeType | null>({
    startDate: now,
    endDate: now,
    key: "selection",
  });
  const [isInserting, setIsInserting] = useState(false);
  const [modality, setModality] = useState<string>("");
  const [activePac, setActivePac] = useState<PacType | null>(null);
  const [loading, setLoading] = useState(false);
  const [studies, setStudies] = useState<Study[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { hasPermission: canManagePacs, isLoading: isLoadingPermission } =
    useCheckPermission(userRoleId, Permissions.MANAGE_PACS);

  const {
    selectedIds,
    isItemSelected,
    toggleItemSelected,
    handleSelectAllClick,
    // isAllItemsSelected,
  } = useCheckboxSelection<TableRowType>();

  const fetchStudies = async (
    activePac: PacType | null,
    startDate: string | null,
    endDate: string | null
  ) => {
    setLoading(true);
    setError(null);

    if (!activePac) return;

    try {
      const response = await fetch("/api/pacs/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institution_name: activePac.institution_name,
          ip: activePac.ip,
          port: activePac.port,
          aet_server: activePac.aet_server,
          aet_client: activePac.aet_client,
          startDate,
          endDate,
          modality,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        const transformedStudies: Study[] = data.studies.map(
          (dicom: DicomType) => ({
            dicom,
            state: StudyState.Selected,
          })
        );
        setStudies(transformedStudies);
      } else {
        setError(data.error || "Query failed");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const noData = loading && !error && studies && studies.length === 0;

  const updateItemState = useCallback(
    (id: string, insertedDicomId: string, newState: StudyState) => {
      setStudies((prev) =>
        prev.map((item) =>
          item.dicom.id === id
            ? { ...item, dicomId: insertedDicomId, state: newState }
            : item
        )
      );
    },
    []
  );

  const upsertStudyBulk = async () => {
    setIsInserting(true);

    for (const item of selectedIds) {
      if (!userId) continue;

      const metadata = studies.filter((study) => study.dicom.id === item);

      if (metadata.length === 0 || !activePac?.aet_server) {
        continue;
      }

      if (metadata[0].state !== StudyState.Selected) {
        continue;
      }

      const result = await upsertStudy(userId, metadata[0].dicom);

      updateItemState(
        item,
        result.id,
        result.isNew ? StudyState.Inserted : StudyState.Duplicated
      );
    }
    setIsInserting(false);
  };

  const handleStudyDateRangeChange = (newRange: DateRangeType | null) => {
    setStudyDateRange(newRange);
  };

  const handleFetch = async (activePac: PacType | null) => {
    handleSelectAllClick([]);
    const timeZone = "America/Lima";
    const zonedStart = studyDateRange?.startDate
      ? toZonedTime(studyDateRange?.startDate, timeZone)
      : null;

    const zonedEnd = studyDateRange?.endDate
      ? toZonedTime(studyDateRange?.endDate, timeZone)
      : null;

    const start = zonedStart ? formatISO(zonedStart) : null;
    const formattedStart = start ? format(new Date(start), "yyyy-MM-dd") : null;
    const end = zonedEnd ? formatISO(zonedEnd) : null;
    const formattedEnd = end ? format(new Date(end), "yyyy-MM-dd") : null;

    await fetchStudies(activePac, formattedStart, formattedEnd);
  };

  const handleModality = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setModality(event.target.value);
  };

  const modalityKeys = Object.keys(Modalities);

  const areStudiesSelected = studies.some(
    (study) =>
      study.state === StudyState.Selected &&
      Array.from(selectedIds).includes(study.dicom.id)
  );

  if (isLoadingPermission)
    return (
      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <div className="h-12 w-24 bg-gray-100 rounded-xl"></div>
          <div className="h-12 w-24 bg-gray-100 rounded-xl"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-8 w-24 bg-gray-100 rounded-xl"></div>
          <div className="h-8 w-24 bg-gray-100 rounded-xl"></div>
        </div>
        <div className="h-12 w-24 bg-gray-100 rounded-xl"></div>
        <div className="w-10 h-12 rounded-xl animate-pulse bg-gray-100"></div>
        <div className="w-full h-12 rounded-xl animate-pulse bg-gray-100"></div>
      </div>
    );

  if (!canManagePacs) return null;

  return (
    <>
      {userId ? (
        <PacsList
          setActivePac={setActivePac}
          activePac={activePac}
          userId={userId}
          userRoleId={userRoleId}
        />
      ) : null}
      {activePac ? (
        <div className="flex-col mb-4 sm:flex-row flex gap-3 items-center">
          {activePac ? (
            <>
              <>
                <DateRangeButtonCalendar
                  dateRange={studyDateRange}
                  handleDateRangeChange={handleStudyDateRangeChange}
                  label="Study Date"
                />
                <div className="relative">
                  <select
                    onChange={handleModality}
                    className="w-36 truncate text-sm px-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500 bg-white"
                  >
                    <option value="">All Modalities</option>
                    {modalityKeys.map((modality, index) => (
                      <option title={modality} key={index}>
                        {modality}
                      </option>
                    ))}
                  </select>
                  <div className="absolute top-1/2 -translate-y-1/2 right-1 pr-3 pointer-events-none bg-white">
                    <Icon icon="solar:alt-arrow-down-linear" fontSize={16} />
                  </div>
                </div>
              </>
              <button
                disabled={loading || !studyDateRange}
                onClick={() => handleFetch(activePac)}
                title="Fetch Pacs"
                className="disabled:opacity-50 border border-transparent disabled:pointer-events-none cursor-pointer px-6 w-fit text-white justify-center py-2 rounded-full bg-black flex gap-2 items-center"
              >
                <span className="block w-5">
                  {loading ? (
                    <Icon
                      icon="solar:record-broken"
                      className="animate-spin"
                      fontSize={ICON_SIZE}
                    />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width={ICON_SIZE}
                      height={ICON_SIZE}
                      viewBox="0 0 16 16"
                    >
                      <g fill="currentColor">
                        <path d="M9 2H8v1h1zm-.854 12l-5-5l.708-.707L8 12.439V11h1v1.44l4.146-4.147l.707.707l-5 5zM8 5h1v1H8z" />
                        <path d="M9 8H8v1h1z" />
                      </g>
                    </svg>
                  )}
                </span>
                <span>Fetch</span>
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      <div className="pl-2 flex item-center mb-4 gap-2">
        <button
          disabled={selectedIds.size === 0 || !areStudiesSelected}
          type="button"
          onClick={() => upsertStudyBulk()}
          title="Insert to Database"
          className="disabled:opacity-50 disabled:pointer-events-none cursor-pointer hover:text-cyan-400 p-2 rounded-lg border border-gray-200 bg-gray-50 transition-colors duration-300 hover:bg-gray-100"
        >
          {isInserting ? (
            <Icon
              icon="solar:record-broken"
              className="animate-spin"
              fontSize={ICON_SIZE}
            />
          ) : (
            <Icon icon="solar:database-outline" fontSize={ICON_SIZE} />
          )}
        </button>
      </div>
      <div className="bg-white shadow rounded-xl overflow-auto">
        <table className="text-sm w-full table-fixed">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="w-10 py-4 text-center"></th>
              <th className="w-6 text-center uppercase text-xs font-semibold py-4">
                #
              </th>
              <th className="w-25 px-[1px]">
                <button
                  type="button"
                  disabled={!!noData}
                  className="py-3 w-full text-left px-2 rounded-lg cursor-pointer uppercase text-xs font-semibold hover:bg-cyan-50 bg-slate-50 transition-colors duration-300"
                >
                  Patient ID
                </button>
              </th>
              <th className="w-36 px-[1px]">
                <button
                  disabled={!!noData}
                  type="button"
                  className="py-3 w-full text-left px-2 rounded-lg cursor-pointer uppercase text-xs font-semibold hover:bg-cyan-50 bg-slate-50 transition-colors duration-300"
                >
                  Institution Name
                </button>
              </th>
              <th className="w-34 px-[1px]">
                <button
                  disabled={!!noData}
                  type="button"
                  className="py-3 w-full text-left px-2 rounded-lg cursor-pointer uppercase text-xs font-semibold hover:bg-cyan-50 bg-slate-50 transition-colors duration-300"
                >
                  Patient Name
                </button>
              </th>
              <th className="w-14 px-[1px]">
                <button
                  disabled={!!noData}
                  type="button"
                  className="py-3 w-full text-left px-2 rounded-lg cursor-pointer uppercase text-xs font-semibold hover:bg-cyan-50 bg-slate-50 transition-colors duration-300"
                >
                  Sex
                </button>
              </th>
              <th className="w-16 px-[1px]">
                <button
                  disabled={!!noData}
                  type="button"
                  className="py-3 w-full text-left px-2 rounded-lg cursor-pointer uppercase text-xs font-semibold hover:bg-cyan-50 bg-slate-50 transition-colors duration-300"
                >
                  Age
                </button>
              </th>
              <th className="w-38 px-[1px]">
                <button
                  disabled={!!noData}
                  type="button"
                  title="Study Description"
                  className="py-3 w-full text-left px-2 rounded-lg cursor-pointer uppercase text-xs font-semibold hover:bg-cyan-50 bg-slate-50 transition-colors duration-300"
                >
                  Study Desc...
                </button>
              </th>
              <th className="w-34 px-[1px]">
                <button
                  disabled={!!noData}
                  type="button"
                  className="py-3 w-full text-left px-2 rounded-lg cursor-pointer uppercase text-xs font-semibold hover:bg-cyan-50 bg-slate-50 transition-colors duration-300"
                >
                  Study Date
                </button>
              </th>
              <th title="Modalidad" className="w-13 px-1">
                <button
                  disabled={!!noData}
                  type="button"
                  className="py-3 w-full text-left px-2 rounded-lg cursor-pointer uppercase text-xs font-semibold hover:bg-cyan-50 bg-slate-50 transition-colors duration-300"
                >
                  M
                </button>
              </th>
              <th className="w-28"></th>
            </tr>
          </thead>
          {noData ? (
            <tbody>
              <tr>
                <td colSpan={11} className="text-center">
                  <div className="relative w-full overflow-hidden">
                    <div className="absolute top-1/2 -translate-x-1/2 left-1/2 -translate-y-1/2 w-1/3 aspect-square rounded-full border border-gray-100"></div>
                    <div className="absolute top-1/2 -translate-x-1/2 left-1/2 -translate-y-1/2 w-1/2 aspect-square rounded-full border border-gray-100"></div>
                    <div className="absolute top-1/2 -translate-x-1/2 left-1/2 -translate-y-1/2 w-1/5 aspect-square rounded-full border border-gray-100"></div>
                    <div className="relative py-30 text-base max-w-80 w-full mx-auto">
                      <Icon
                        icon="solar:file-text-linear"
                        fontSize={60}
                        className="mb-6 mx-auto"
                      ></Icon>
                      <div className="font-semibold text-lg px-4 mb-2">
                        No data found
                      </div>
                      <div className="text-gray-500 mb-6">
                        Your search{" "}
                        <div className="line-clamp-2 font-semibold text-black">
                          {/* {search} */}
                        </div>{" "}
                        did not match any items. Please try again.
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody className="whitespace-nowrap">
              {studies.map((study, index) => {
                const dicom = study.dicom;
                const dicomId = study.dicomId;
                const state = study.state;
                const {
                  id,
                  patient_id,
                  patient_name,
                  study_description,
                  study_date,
                  institution,
                  modality,
                  birthday,
                  gender,
                } = dicom;
                const patientAge = getAgeFromYYYYMMDD(birthday);
                const patientAgeFormatted = `${extractAgeWidthUnit(patientAge as string).value} ${extractAgeWidthUnit(patientAge as string).unit}`;

                return (
                  <tr
                    key={id}
                    className={`${index % 2 === 0 ? "bg-gray-50" : ""} ${
                      index === 0 ? " " : "border-t border-gray-200"
                    }`}
                  >
                    <td className="py-3 pl-2 pr-1 text-center">
                      <div className="relative w-fit cursor-pointer">
                        <input
                          id={id}
                          type="checkbox"
                          className="hidden peer"
                          checked={isItemSelected(id)}
                          onChange={() => toggleItemSelected(id)}
                        />
                        <label
                          htmlFor={id}
                          className="block cursor-pointer p-2 w-9 h-9 text-gray-400"
                        ></label>
                        <div className="pointer-events-none bg-white w-5 h-5 border-2 peer-checked:border-cyan-400 rounded-sm text-gray-400 peer-checked:text-cyan-400 absolute top-1/2 -translate-x-1/2 -translate-y-1/2 left-1/2"></div>
                        <svg
                          className="hidden peer-checked:text-cyan-400 pointer-events-none peer-checked:block absolute top-1/2 -translate-x-1/2 -translate-y-1/2 left-1/2"
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                        >
                          <g fill="none" fillRule="evenodd">
                            <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
                            <path
                              fill="currentColor"
                              d="M21.546 5.111a1.5 1.5 0 0 1 0 2.121L10.303 18.475a1.6 1.6 0 0 1-2.263 0L2.454 12.89a1.5 1.5 0 1 1 2.121-2.121l4.596 4.596L19.424 5.111a1.5 1.5 0 0 1 2.122 0"
                            />
                          </g>
                        </svg>
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-5 text-center">
                      {index + 1}
                    </td>
                    <td
                      title={patient_id}
                      className="py-5 px-2 truncate whitespace-nowrap"
                    >
                      <span className="text-sm">{patient_id}</span>
                    </td>
                    <td className="truncate whitespace-nowrap py-5 px-2">
                      {institution}
                    </td>
                    <td
                      title={patient_name}
                      className="truncate whitespace-nowrap py-5 px-2"
                    >
                      {patient_name}
                    </td>
                    <td className="py-5 px-2 text-center">{gender}</td>
                    <td className="whitespace-nowrap py-5 px-2">
                      {patientAgeFormatted}
                    </td>
                    <td className="truncate whitespace-nowrap py-5 px-2">
                      {study_description}
                    </td>
                    <td className="whitespace-nowrap py-5 px-2">
                      {formatDate(study_date)}
                    </td>
                    <td className="py-5 px-2 text-center">{modality}</td>
                    <td className="py-2 px-2">
                      {state === StudyState.Duplicated ||
                      state === StudyState.Inserted ? (
                        <Link
                          key={id}
                          target="_blank"
                          href={`/admin/dicoms/${dicomId}`}
                          className="flex gap-2 first:border-t-0 border-t border-gray-200 px-5 py-2 text-left underline hover:text-cyan-500 transition-colors duration-300 underline-offset-4 w-full justify-center"
                        >
                          <Icon
                            icon={`${state === StudyState.Duplicated ? "solar:check-read-bold" : "solar:verified-check-bold"}`}
                            fontSize={24}
                            className="text-cyan-500 flex-shrink-0"
                          />
                          <span className="flex-grow-1">{state}</span>
                        </Link>
                      ) : (
                        ""
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>
      </div>
    </>
  );
}
