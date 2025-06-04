"use client";

import FormSkeleton from "@/components/FormSkeleton";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import useSWR, { mutate } from "swr";
import UploaderTemplateImageUploader from "./TemplateImageUploader";
import { Icon } from "@iconify/react/dist/iconify.js";
import FieldsSection from "./FieldsSection";
import FieldLabel from "./FieldLabel";

type Inputs = {
  name: string;
  description: string;
  header_image_url: string;
  footer_image_url: string;
  sign_image_url: string;
};

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
  const {
    data: template,
    isLoading,
    mutate: mutateTemplate,
  } = useSWR(id, () => fetcher(id));

  const { reset, register, handleSubmit } = useForm<Inputs>({
    mode: "onBlur",
    defaultValues: useMemo(() => {
      return template;
    }, [template]),
  });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    try {
      const { data: updatedTemplate } = await supabase
        .from("template")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (updatedTemplate) {
        await mutateTemplate(updatedTemplate);
        await mutate("templates");
        await reset();
        window.location.href = "/admin/templates";
      }
    } catch (error) {
      console.error(error);
    } finally {
    }
  };

  useEffect(() => {
    reset(template);
  }, [template]);

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
          <form onSubmit={handleSubmit(onSubmit)}>
            <fieldset className="flex flex-col gap-4">
              <FieldsSection>
                <h2 className="font-semibold">General Information</h2>
                <div className="flex gap-4 items-center">
                  <div className="grow-1">
                    <FieldLabel htmlFor="name">Name</FieldLabel>
                    <input
                      type="text"
                      id="name"
                      {...register("name")}
                      required
                      className="w-full px-4 bg-white py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
                    />
                  </div>
                  <div className="grow-1">
                    <FieldLabel htmlFor="description">Description</FieldLabel>
                    <input
                      type="text"
                      id="description"
                      {...register("description")}
                      required
                      className="w-full bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
                    />
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
          </form>
        </>
      )}
    </>
  );
}
