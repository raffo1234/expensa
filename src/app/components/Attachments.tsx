"use client";

import { supabase } from "@/lib/supabase";
import { useSliderState } from "./Slider";
import SliderFiles from "./SliderFiles";
import useSWR from "swr";
import { FileType } from "@/types/fileType";
import {
  isValidElement,
  cloneElement,
  ReactElement,
  MouseEvent,
  ButtonHTMLAttributes,
} from "react";

const filesFetcher = async (dicomId: string) => {
  const { data } = (await supabase
    .from("file")
    .select("*")
    .eq("dicom_id", dicomId)
    .order("created_at", { ascending: true })) as { data: FileType[] | null };
  return data;
};

export default function Attachments({
  dicomId,
  Button,
}: {
  dicomId: string;
  Button: ReactElement<ButtonHTMLAttributes<HTMLButtonElement>>;
}) {
  const { setSliderContent, setSliderOpen } = useSliderState();

  const { data: files, isLoading } = useSWR(`admin-files-${dicomId}`, () =>
    dicomId ? filesFetcher(dicomId) : null
  );

  const onClick = () => {
    if (files) setSliderContent(<SliderFiles files={files} />);
    setSliderOpen(true);
  };

  if (isLoading) return null;

  if (Button && isValidElement(Button) && files && files.length > 0) {
    return cloneElement(Button, {
      onClick: (e: MouseEvent<HTMLButtonElement>) => {
        Button.props.onClick?.(e);
        onClick();
      },
    });
  }

  return null;
}
