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

const filesFetcher = async (dicomId: string) => {
  const { data } = (await supabase
    .from("file")
    .select("*")
    .eq("dicom_id", dicomId)
    .order("created_at", { ascending: true })) as { data: FileType[] | null };
  return data;
};

export default function MyStudy({ dicom }: { dicom: Partial<DicomType> }) {
  const { id, state, patient_id, patient_name, study_description, study_date } =
    dicom;
  const { setModalContent, setModalOpen, setOnModalClose } = useGlobalState();

  const { data: files, mutate: mutateFiles } = useSWR(
    `admin-${dicom.id}`,
    () => (dicom.id ? filesFetcher(dicom.id) : null)
  );

  const onClick = () => {
    setModalContent(
      <AttachFiles
        dicom={dicom}
        setOnModalClose={setOnModalClose}
        mutateFiles={mutateFiles}
      />
    );
    setModalOpen(true);
  };

  return (
    <div className="bg-white rounded-lg shadow-xs p-6 mb-2" key={id}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-sm mb-2 text-gray-400">ID: {patient_id}</h2>
          <div className="font-semibold mb-2 text-sm">{patient_name}</div>
          <div className="text-xs text-gray-400 mb-2">{study_description}</div>
          <div className="font-semibold text-sm">
            Study Date: {study_date ? formatDate(study_date) : null}
          </div>
        </div>
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
                              py-1 px-5 text-xs mb-6 uppercase w-fit rounded-xl border`}
          title={state}
        >
          {!state ? "Sent" : state}
        </div>
      </div>
      <div
        className="mb-4 gap-3 grid"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
        }}
      >
        {files?.map((file) => {
          const { id, path, name, extension } = file;

          return (
            <article key={id} className="bg-gray-100 p-3 rounded-lg">
              {extension === "application/pdf" ? (
                <div className="overflow-hidden">
                  <PDFViewer fileUrl={path} width={200} />
                </div>
              ) : (
                <Image
                  priority
                  key={id}
                  src={path}
                  width={200}
                  height={200}
                  title={name}
                  alt={name ?? ""}
                />
              )}
              <div>{name}</div>
              <DeleteFile file={file} mutate={mutateFiles} />
            </article>
          );
        })}
      </div>
      <button
        onClick={onClick}
        type="button"
        className="flex gap-2 cursor-pointer text-white px-6 font-semibold py-2 rounded-full bg-cyan-400"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
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
    </div>
  );
}
