import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DicomType } from "@/types/dicomType";
import formatDate from "@/lib/formatDate";
import { DicomStateEnum } from "@/enums/dicomStateEnum";
import { supabase } from "@/lib/supabase";
import useSWR from "swr";
import Image from "next/image";
import { PDFViewer } from "./PDFViewer";
import { FileType } from "@/types/fileType";
import DeleteFile from "./DeleteFile";
import { useSliderState } from "./Slider";
import SliderFiles from "./SliderFiles";
import AssignDicomToTrigger from "./AssignDicomToTrigger";
import GeneratePDFButton from "./GeneratePDFButton";
import Step from "./Step";
import ModalToCommentDicom from "./ModalToCommentDicom";
import ModalToAttachFilesToDicom from "./ModalToAttachFilesToDicom";
import ModalToDisplayDicomComment from "./ModalToDisplayDicomComment";

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
  const { id, state, patient_id, patient_name, study_description, created_at, study_date } = dicom;
  const { setSliderContent, setSliderOpen } = useSliderState();

  const { data: files, mutate: mutateFiles } = useSWR(`admin-files-${dicom.id}`, () =>
    dicom.id ? filesFetcher(dicom.id) : null,
  );

  const openSlider = (index: number) => {
    if (files) setSliderContent(<SliderFiles firstIndex={index} files={files} />);
    setSliderOpen(true);
  };

  const parsedCreatedAt = created_at ? new Date(created_at) : null;

  const formattedCreatedAt = parsedCreatedAt
    ? format(parsedCreatedAt, "dd 'de' MMMM 'de' yyyy 'a las' h:mm a", {
        locale: es,
      })
    : null;

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
      <div className="sm:flex items-start justify-between">
        <div className="pb-7 mb-2 border-b border-slate-200 sm:border-b-0">
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
          </div>
          <div className="flex gap-2 mt-2">
            <ModalToAttachFilesToDicom dicomId={dicom.id} />
            {state !== DicomStateEnum.COMPLETED ? <ModalToCommentDicom dicomId={dicom.id} /> : null}
            {state === DicomStateEnum.COMPLETED ? (
              <ModalToDisplayDicomComment comment={dicom.comment} />
            ) : null}
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
                    {state !== DicomStateEnum.COMPLETED ? (
                      <DeleteFile file={file} mutate={mutateFiles} />
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
        <div>
          <Step isFirst isActive title="Scan Received" description={formattedCreatedAt} />
          <Step
            isActive={state === DicomStateEnum.COMPLETED}
            isInProgress={state === DicomStateEnum.DRAFT || state === DicomStateEnum.VIEWED}
            title="Expert Review In Progress"
            description={
              <>
                {state === DicomStateEnum.DRAFT ? "Review Started" : ""}
                {state === DicomStateEnum.VIEWED ? "In Review " : ""}
                {state === DicomStateEnum.COMPLETED ? "Completed" : ""}
              </>
            }
          />
          <Step
            isLast
            isActive={state === DicomStateEnum.COMPLETED}
            title="Diagnosis Finalized"
            description={
              <>
                {state === DicomStateEnum.COMPLETED ? (
                  <GeneratePDFButton dicomId={dicom.id} />
                ) : null}
                {state !== DicomStateEnum.COMPLETED ? (
                  <div className="flex items-center">
                    <svg
                      className="grayscale opacity-40"
                      xmlns="http://www.w3.org/2000/svg"
                      width={28}
                      height={28}
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="#ef5350"
                        d="M13 9h5.5L13 3.5zM6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2m4.93 10.44c.41.9.93 1.64 1.53 2.15l.41.32c-.87.16-2.07.44-3.34.93l-.11.04l.5-1.04c.45-.87.78-1.66 1.01-2.4m6.48 3.81c.18-.18.27-.41.28-.66c.03-.2-.02-.39-.12-.55c-.29-.47-1.04-.69-2.28-.69l-1.29.07l-.87-.58c-.63-.52-1.2-1.43-1.6-2.56l.04-.14c.33-1.33.64-2.94-.02-3.6a.85.85 0 0 0-.61-.24h-.24c-.37 0-.7.39-.79.77c-.37 1.33-.15 2.06.22 3.27v.01c-.25.88-.57 1.9-1.08 2.93l-.96 1.8l-.89.49c-1.2.75-1.77 1.59-1.88 2.12c-.04.19-.02.36.05.54l.03.05l.48.31l.44.11c.81 0 1.73-.95 2.97-3.07l.18-.07c1.03-.33 2.31-.56 4.03-.75c1.03.51 2.24.74 3 .74c.44 0 .74-.11.91-.3m-.41-.71l.09.11c-.01.1-.04.11-.09.13h-.04l-.19.02c-.46 0-1.17-.19-1.9-.51c.09-.1.13-.1.23-.1c1.4 0 1.8.25 1.9.35M7.83 17c-.65 1.19-1.24 1.85-1.69 2c.05-.38.5-1.04 1.21-1.69zm3.02-6.91c-.23-.9-.24-1.63-.07-2.05l.07-.12l.15.05c.17.24.19.56.09 1.1l-.03.16l-.16.82z"
                      />
                    </svg>
                  </div>
                ) : null}
              </>
            }
          />
        </div>
      </div>
    </div>
  );
}
