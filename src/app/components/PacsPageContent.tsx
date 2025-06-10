"use client";

import extractAgeWidthUnit from "@/lib/extractAgeWithUnit";
import useCheckPermission from "@/hooks/useCheckPermission";
import formatDateYYYYMMDD from "@/lib/formatDateYYYYMMDD";
import { Permissions } from "@/types/propertyState";
import { Icon } from "@iconify/react/dist/iconify.js";
import { formatInTimeZone } from "date-fns-tz";
import es from "date-fns/locale/es";
import useCheckboxSelection from "@/hooks/useCheckboxSelection";
import Link from "next/link";
import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import PacsList from "./PacsList";
import { PacType } from "@/types/PacType";
import getAgeFromYYYYMMDD from "@/lib/getAgeFromYYYYMMDD";

interface TableRowType {
  id: string;
}

interface Dataset {
  id: string;
  patientId: string;
  patientName: string;
  studyDescription: string;
  studyDate: string;
  studyTime: string;
  modalitiesInStudy: string;
  patientBirthDate: string;
  patientSex: string;
}

export default function PacsPageContent({
  userId,
  userRoleId,
}: {
  userRoleId: string;
  userId: string | undefined;
}) {
  const [activePac, setActivePac] = useState<PacType | null>(null);
  const [search, setSearch] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [studies, setStudies] = useState<Dataset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { hasPermission: canManagePacs, isLoading: isLoadingPermission } =
    useCheckPermission(userRoleId, Permissions.MANAGE_PACS);

  const {
    selectedIds,
    isItemSelected,
    toggleItemSelected,
    handleSelectAllClick,
    isAllItemsSelected,
  } = useCheckboxSelection<TableRowType>();

  const fetchStudies = async (activePac: PacType | null) => {
    setLoading(true);
    setError(null);

    if (!activePac) return;

    try {
      const response = await fetch("/api/pacs/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip: activePac.ip,
          port: activePac.port,
          aet_server: activePac.aet_server,
          aet_client: activePac.aet_client,
          startDate: "2025-06-09",
          endDate: "2025-06-10",
        }),
      });

      const data = await response.json();
      console.log(data);
      if (data.ok) {
        setStudies(data.studies);
      } else {
        setError(data.error || "Query failed");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = useDebouncedCallback((value) => {
    console.log(value);
  }, 300);

  const noData = loading && !error && studies && studies.length === 0;

  const items = studies
    ? studies?.map(({ id }) => {
        return {
          id,
        };
      })
    : [];

  if (isLoadingPermission) return null;
  if (!canManagePacs) return null;

  return (
    <>
      {activePac?.aet_server}
      <PacsList
        setActivePac={setActivePac}
        activePac={activePac}
        userId={userId}
        userRoleId={userRoleId}
      />
      <div className="flex mb-6 w-full justify-between items-center gap-2">
        <div className="flex max-w-xl items-center gap-2 mx-auto sm:mx-0">
          <button
            disabled={!activePac}
            onClick={() => fetchStudies(activePac)}
            title="Fetch Pacs"
            className="disabled:opacity-70  disabled:pointer-events-none cursor-pointer px-6 w-fit mx-auto text-white justify-center py-2 rounded-full bg-black flex gap-3 items-center"
          >
            <span>Fetch</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
            >
              <g
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.5"
              >
                <path d="M17 9.002c2.175.012 3.353.109 4.121.877C22 10.758 22 12.172 22 15v1c0 2.829 0 4.243-.879 5.122C20.243 22 18.828 22 16 22H8c-2.828 0-4.243 0-5.121-.878C2 20.242 2 18.829 2 16v-1c0-2.828 0-4.242.879-5.121c.768-.768 1.946-.865 4.121-.877" />
                <path
                  strokeLinejoin="round"
                  d="M12 2v13m0 0l-3-3.5m3 3.5l3-3.5"
                />
              </g>
            </svg>
          </button>
          <input
            type="text"
            className="bg-white w-full rounded-full border border-gray-200 outline-0 py-2 px-5"
            placeholder="Search ..."
            defaultValue={search ?? ""}
            onChange={(event) => debouncedSearch(event.target.value)}
          />
        </div>
      </div>
      <div className="w-fit pl-2 flex item-center mb-4 gap-2">
        <div className="relative w-9 h-9">
          <input
            id="all"
            type="checkbox"
            checked={isAllItemsSelected(items)}
            onChange={() => handleSelectAllClick(items)}
            className="hidden peer"
          />
          <label
            htmlFor="all"
            className="cursor-pointer block w-full h-full border absolute top-1/2 -translate-x-1/2 -translate-y-1/2 left-1/2 border-gray-200 rounded-lg text-gray-400"
          ></label>
          <div className="bg-white cursor-pointer block w-5 h-5 border-2 pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 left-1/2 peer-checked:border-cyan-400 rounded-sm text-gray-400 peer-checked:text-cyan-400"></div>
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
        {selectedIds.size > 0 ? <>actions</> : null}
      </div>

      <div className="bg-white shadow rounded-xl overflow-auto">
        <table className="text-sm w-full table-fixed">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="w-13 py-4 text-center"></th>
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
              <th className="w-98"></th>
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
              {studies?.map(
                (
                  {
                    id,
                    patientId,
                    patientName,
                    studyDescription,
                    studyDate,
                    institutionName,
                    studyTime,
                    modalitiesInStudy,
                    patientBirthDate,
                    patientSex,
                  },
                  index
                ) => {
                  const patientAge = getAgeFromYYYYMMDD(patientBirthDate);
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
                      <td className="py-5 px-2">
                        <Link href={`/admin/dicoms/${id}`} className="text-sm">
                          {patientId}
                        </Link>
                      </td>
                      <td className="truncate whitespace-nowrap py-5 px-2">
                        {institutionName}
                      </td>
                      <td
                        title={patientName}
                        className="truncate whitespace-nowrap py-5 px-2"
                      >
                        {patientName}
                      </td>
                      <td className="py-5 px-2 text-center">{patientSex}</td>
                      <td className="whitespace-nowrap py-5 px-2">
                        {patientAgeFormatted}
                      </td>
                      <td className="truncate whitespace-nowrap py-5 px-2">
                        studyDescription
                      </td>
                      <td className="whitespace-nowrap py-5 px-2">
                        {formatDateYYYYMMDD(studyDate)} {studyTime}
                      </td>
                      <td className="py-5 px-2 text-center">
                        {modalitiesInStudy}
                      </td>
                      <td className="py-2 px-2"></td>
                    </tr>
                  );
                }
              )}
            </tbody>
          )}
        </table>
      </div>
    </>
  );
}
