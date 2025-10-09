// AttachedFilesContent.tsx

import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { FileType } from "@/types/fileType";
import { PDFViewer } from "./PDFViewer";
import Image from "next/image";
import SliderFiles from "./SliderFiles";
import DeleteFile from "./DeleteFile";
import { useSliderState } from "./Slider";
import AttachFiles from "./AttachFiles";

const filesFetcher = async (dicomId: string) => {
  const { data } = (await supabase
    .from("file")
    .select("*")
    .eq("dicom_id", dicomId)
    .order("created_at", { ascending: true })) as { data: FileType[] | null };
  return data;
};

export default function AttachedFilesContent({
  dicomId,
  setOnModalClose,
}: {
  dicomId: string;
  setOnModalClose: (cb: () => void) => void;
}) {
  const swrKeyFiles = `admin-files-${dicomId}`;
  const { setSliderContent, setSliderOpen } = useSliderState();

  const {
    data: files,
    mutate: mutateFiles,
    isLoading: isLoadingFiles,
  } = useSWR(swrKeyFiles, () => filesFetcher(dicomId));

  const openSlider = (index: number) => {
    if (files) setSliderContent(<SliderFiles firstIndex={index} files={files} />);
    setSliderOpen(true);
  };

  if (isLoadingFiles) {
    return <div className="text-gray-500 mt-4">Loading files...</div>;
  }

  return (
    <>
      <AttachFiles
        dicomId={dicomId}
        setOnModalClose={setOnModalClose} // Keep setOnModalClose for the parent to use
        mutateFiles={mutateFiles} // Pass the mutate function from *this* component
      />
      {files && files.length > 0 ? (
        <div
          className="mt-4 gap-3 grid"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          }}
        >
          {files.map((file, index) => {
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
      ) : (
        <div className="text-gray-500 mt-4">No files attached.</div>
      )}
    </>
  );
}
