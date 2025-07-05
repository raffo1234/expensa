import { DicomType } from "@/types/dicomType";
import formatDate from "@/lib/formatDate";
import { DicomStateEnum } from "@/enums/dicomStateEnum";
import { useGlobalState } from "@/lib/globalState";
import AttachFiles from "./AttachFiles";
import { supabase } from "@/lib/supabase";
import useSWR from "swr";
import Image from "next/image";
import { PDFViewer } from "./PDFViewer";
import { FileType } from "@/types/fileType";
import DeleteFile from "./DeleteFile";
import { useSliderState } from "./Slider";
import SliderFiles from "./SliderFiles";
import AssignDicomToTrigger from "./AssignDicomToTrigger";
import { ICON_SIZE } from "@/constants";
import GeneratePDFButton from "./GeneratePDFButton";

const filesFetcher = async (dicomId: string) => {
  const { data } = (await supabase
    .from("file")
    .select("*")
    .eq("dicom_id", dicomId)
    .order("created_at", { ascending: true })) as { data: FileType[] | null };
  return data;
};

export default function MyStudy({
  dicom,
  userId,
  userRoleId,
  isItemSelected,
  toggleItemSelected,
}: {
  dicom: Partial<DicomType>;
  userId: string;
  userRoleId: string;
  isItemSelected: (id: string) => void;
  toggleItemSelected: (id: string) => void;
}) {
  const { id, state, patient_id, patient_name, study_description, study_date } = dicom;
  const { setSliderContent, setSliderOpen } = useSliderState();
  const { setModalContent, setOnModalClose, setModalOpen } = useGlobalState();

  const { data: files, mutate: mutateFiles } = useSWR(`admin-files-${dicom.id}`, () =>
    dicom.id ? filesFetcher(dicom.id) : null,
  );

  const onClick = () => {
    setModalContent(
      <AttachFiles dicom={dicom} setOnModalClose={setOnModalClose} mutateFiles={mutateFiles} />,
    );
    setModalOpen(true);
  };

  const openSlider = (index: number) => {
    if (files) setSliderContent(<SliderFiles firstIndex={index} files={files} />);
    setSliderOpen(true);
  };

  if (!dicom.id) return null;

  return (
    <div className="bg-white rounded-lg shadow-xs p-6 mb-2" key={id}>
      <div className="flex gap-2 items-center mb-3">
        <div className="relative w-fit cursor-pointer -ml-2">
          <input
            id={id}
            type="checkbox"
            className="hidden peer"
            checked={isItemSelected(dicom.id) ?? false}
            onChange={() => toggleItemSelected(dicom.id as string)}
          />
          <label htmlFor={id} className="block cursor-pointer p-2 w-9 h-9 text-gray-400"></label>
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
        {dicom.id ? (
          <AssignDicomToTrigger dicomIds={[dicom.id]} userId={userId} userRoleId={userRoleId} />
        ) : null}
      </div>
      <div className="sm:flex justify-between items-center">
        <div className="flex gap-2">
          <div>
            <h2 className="text-sm mb-2 text-gray-400">ID: {patient_id}</h2>
            <div className="font-semibold mb-2 text-sm">{patient_name}</div>
            <div className="text-xs text-gray-400 mb-2">{study_description}</div>
            <div className="font-semibold text-sm">
              Study Date: {study_date ? formatDate(study_date) : null}
            </div>
          </div>
        </div>
        <div className="mt-4 sm:mt-0 flex mb-4 items-center gap-2">
          <div
            className={`
                              font-semibold uppercase
                              ${!state ? " border-gray-100 bg-gray-50" : ""} 
                              ${
                                state === DicomStateEnum.VIEWED
                                  ? "text-yellow-500 border-yellow-300 bg-yellow-50"
                                  : ""
                              }  
                              ${
                                state === DicomStateEnum.DRAFT
                                  ? "text-orange-500 border-orange-100 bg-orange-50"
                                  : ""
                              }  
                              ${
                                state === DicomStateEnum.COMPLETED
                                  ? "text-cyan-600 border-cyan-200 bg-cyan-100"
                                  : ""
                              }  
                              py-2 px-5 text-xs uppercase w-fit rounded-full border`}
            title={state}
          >
            {!state ? "Sent" : state}
          </div>
          <GeneratePDFButton dicomId={dicom.id} />
        </div>
      </div>
      {files && files.length > 0 ? (
        <div
          className="mt-4 gap-3 grid"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          }}
        >
          {files?.map((file, index) => {
            const { id, path, name, extension } = file;

            return (
              <article key={id} className="bg-gray-100 p-3 rounded-lg">
                <button
                  onClick={() => openSlider(index)}
                  className="block cursor-pointer h-30 w-full overflow-hidden"
                >
                  {extension === "application/pdf" ? (
                    <PDFViewer fileUrl={path} />
                  ) : (
                    <Image
                      priority
                      key={id}
                      src={path}
                      width={140}
                      height={200}
                      title={name}
                      alt={name ?? ""}
                      className="object-cover h-full rounded-sm w-full "
                    />
                  )}
                </button>
                <div>{name}</div>
                <DeleteFile file={file} mutate={mutateFiles} />
              </article>
            );
          })}
        </div>
      ) : null}
      {state !== DicomStateEnum.COMPLETED ? (
        <button
          onClick={onClick}
          type="button"
          title="Attach files"
          className="flex mt-4 gap-2 cursor-pointer text-white px-6 font-semibold py-2 rounded-full bg-cyan-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={ICON_SIZE}
            height={ICON_SIZE}
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              fillRule="evenodd"
              d="M8.886 3.363c2.942-2.817 7.7-2.817 10.643 0c2.961 2.834 2.961 7.444 0 10.279l-7.948 7.608c-2.09 2-5.466 2-7.556 0a5.03 5.03 0 0 1 0-7.324l7.834-7.498a3.253 3.253 0 0 1 4.468 0a3 3 0 0 1 0 4.367l-7.89 7.554a.75.75 0 1 1-1.038-1.084l7.89-7.553a1.503 1.503 0 0 0 0-2.2a1.753 1.753 0 0 0-2.393 0L5.062 15.01a3.53 3.53 0 0 0 0 5.156c1.51 1.445 3.972 1.445 5.482 0l7.948-7.608c2.344-2.244 2.344-5.868 0-8.112c-2.363-2.261-6.206-2.261-8.57 0l-6.403 6.13A.75.75 0 0 1 2.48 9.493z"
              clipRule="evenodd"
            />
          </svg>
          <span>Attach files</span>
        </button>
      ) : null}
    </div>
  );
}
