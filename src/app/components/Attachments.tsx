"use client";

import { supabase } from "@/lib/supabase";
import { useSliderState } from "./Slider";
import SliderFiles from "./SliderFiles";
import useSWR from "swr";
import { FileType } from "@/types/fileType";

const filesFetcher = async (dicomId: string) => {
  const { data } = (await supabase
    .from("file")
    .select("*")
    .eq("dicom_id", dicomId)
    .order("created_at", { ascending: true })) as { data: FileType[] | null };
  return data;
};

export default function Attachments({ dicomId }: { dicomId: string }) {
  const { setSliderContent, setSliderOpen } = useSliderState();

  const { data: files, isLoading } = useSWR(`admin-files-${dicomId}`, () =>
    dicomId ? filesFetcher(dicomId) : null
  );

  const onClick = () => {
    if (files) setSliderContent(<SliderFiles files={files} />);
    setSliderOpen(true);
  };

  if (isLoading) return null;

  return (
    <button
      title="Attachments"
      onClick={onClick}
      type="button"
      className="flex gap-2 outline-0 mt-4 cursor-pointer text-white px-6 font-semibold py-2 rounded-full bg-cyan-400"
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
      <span>Attachments</span>
    </button>
  );
}
