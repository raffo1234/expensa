"use client";

import FormSkeleton from "@/components/FormSkeleton";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import UploaderTemplateImageUploader from "./TemplateImageUploader";
import { Icon } from "@iconify/react/dist/iconify.js";
import FieldsSection from "./FieldsSection";
import FieldLabel from "./FieldLabel";
import DotsLoading from "./DotsLoading";
import { useDebouncedCallback } from "use-debounce";

const fetcher = async (id: string) => {
  const { data, error } = await supabase
    .from("template")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
};

export default function EditTemplate({ id }: { id: string }) {
  const [isSaving, setIsSaving] = useState({ state: false, field: "" });

  const {
    data: template,
    isLoading,
    mutate: mutateTemplate,
  } = useSWR(id, () => fetcher(id));

  const debouncedInput = useDebouncedCallback((event) => {
    updateTemplate(event.target.name, event.target.value);
  }, 350);

  const updateTemplate = async (fieldName: string, data: string) => {
    setIsSaving((prev) => ({ ...prev, state: true, field: fieldName }));
    try {
      await supabase
        .from("template")
        .update({ [fieldName]: data })
        .eq("id", id);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving((prev) => ({ ...prev, state: false, field: fieldName }));
      await mutateTemplate();
    }
  };

  return (
    <>
      {isLoading ? (
        <FormSkeleton rows={2} />
      ) : (
        <>
          <div className="flex mb-4 items-center justify-between">
            <h1 className=" font-semibold text-lg block">
              <span className="capitalize">{template.name}</span>
            </h1>
            <Link
              href="/admin/templates"
              title="Templates"
              className="p-2 hover:text-cyan-400 transition-colors duration-300"
            >
              <Icon icon="solar:backspace-line-duotone" fontSize={36} />
            </Link>
          </div>
          <fieldset className="flex flex-col gap-4">
            <FieldsSection>
              <h2 className="font-semibold">General Information</h2>
              <div className="flex gap-4 items-center">
                <div className="grow-1 relative">
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    defaultValue={template.name}
                    required
                    onChange={debouncedInput}
                    className="w-full px-4 bg-white py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
                  />
                  <div
                    className={`${isSaving.state && isSaving.field === "name" ? "opacity-100" : "opacity-0"} transition-opacity duration-300 absolute right-2 -bottom-3 sm:-bottom-4`}
                  >
                    <DotsLoading />
                  </div>
                </div>
                <div className="grow-1 relative">
                  <FieldLabel htmlFor="description">Description</FieldLabel>
                  <input
                    type="text"
                    id="description"
                    name="description"
                    defaultValue={template.description}
                    onChange={debouncedInput}
                    required
                    className="w-full bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
                  />
                  <div
                    className={`${isSaving.state && isSaving.field === "description" ? "opacity-100" : "opacity-0"} transition-opacity duration-300 absolute right-2 -bottom-3 sm:-bottom-4`}
                  >
                    <DotsLoading />
                  </div>
                </div>
              </div>
            </FieldsSection>
            <FieldsSection>
              <h2 className="font-semibold">
                Header Image <br />
              </h2>
              <UploaderTemplateImageUploader
                templateId={id}
                imageFileName="header_image_url"
                userId={template.user_id}
                fileNamePrefix="header"
                mutate={mutateTemplate}
                templateImageUrl={template.header_image_url}
              />
            </FieldsSection>
            <FieldsSection>
              <h2 className="font-semibold">
                Sign Image <br />
                <span className="text-sm text-gray-500 font-normal">
                  Image dimensions: (75pt x 76.5pt) o (100px x 102px)
                </span>
              </h2>
              <UploaderTemplateImageUploader
                templateId={id}
                imageFileName="sign_image_url"
                userId={template.user_id}
                previewImageWidth="75pt"
                fileNamePrefix="sign"
                templateImageUrl={template.sign_image_url}
                mutate={mutateTemplate}
              />
            </FieldsSection>
            <FieldsSection>
              <h2 className="font-semibold">Footer Image</h2>
              <UploaderTemplateImageUploader
                templateId={id}
                imageFileName="footer_image_url"
                userId={template.user_id}
                fileNamePrefix="footer"
                templateImageUrl={template.footer_image_url}
                mutate={mutateTemplate}
              />
            </FieldsSection>
          </fieldset>
        </>
      )}
    </>
  );
}
