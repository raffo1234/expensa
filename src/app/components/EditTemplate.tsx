"use client";

import FormSkeleton from "@/components/FormSkeleton";
import { supabase } from "@/lib/supabase";
import { useCallback, useState } from "react";
import useSWR from "swr";
import UploaderTemplateImageUploader from "./TemplateImageUploader";
import FieldsSection from "./FieldsSection";
import FieldLabel from "./FieldLabel";
import DotsLoading from "./DotsLoading";
import { useDebouncedCallback } from "use-debounce";
import toast from "react-hot-toast";
import templateFetcher from "@/lib/templateFetcher";

export default function EditTemplate({
  id,
  fallbackTemplate,
}: {
  id: string;
  fallbackTemplate?: Record<string, string>;
}) {
  const [isSaving, setIsSaving] = useState({ state: false, field: "" });

  const {
    data: template,
    isLoading,
    mutate: swrMutate,
  } = useSWR(id, () => templateFetcher(id), { fallbackData: fallbackTemplate });

  const mutateTemplate = useCallback(async () => {
    await swrMutate();
  }, [swrMutate]);

  const updateTemplate = async (fieldName: string, data: string) => {
    setIsSaving((prev) => ({ ...prev, state: true, field: fieldName }));
    try {
      await supabase
        .from("template")
        .update({ [fieldName]: data })
        .eq("id", id);
      toast.success("Template saved successfully!");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving((prev) => ({ ...prev, state: false, field: fieldName }));
      await mutateTemplate();
    }
  };

  const debouncedInput = useDebouncedCallback((event) => {
    updateTemplate(event.target.name, event.target.value);
  }, 350);

  if (isLoading || !template) return <FormSkeleton rows={2} />;

  return (
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
              className="w-full px-4 bg-white py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500"
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
              className="w-full bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500"
            />
            <div
              className={`${isSaving.state && isSaving.field === "description" ? "opacity-100" : "opacity-0"} transition-opacity duration-300 absolute right-2 -bottom-3 sm:-bottom-4`}
            >
              <DotsLoading />
            </div>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <div className="grow-1 relative">
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <input
              type="email"
              id="email"
              name="email"
              defaultValue={template.email}
              required
              onChange={debouncedInput}
              className="w-full px-4 bg-white py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500"
            />
            <div
              className={`${isSaving.state && isSaving.field === "email" ? "opacity-100" : "opacity-0"} transition-opacity duration-300 absolute right-2 -bottom-3 sm:-bottom-4`}
            >
              <DotsLoading />
            </div>
          </div>
        </div>
      </FieldsSection>
      <FieldsSection>
        <h2 className="font-semibold">Header Image</h2>
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
  );
}
