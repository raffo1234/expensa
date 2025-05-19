"use client";

import FormSkeleton from "@/components/FormSkeleton";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import useSWR, { mutate } from "swr";
import UploaderTemplateImageUploader from "./TemplateImageUploader";
import { Icon } from "@iconify/react/dist/iconify.js";

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
              <span className="capitalize">{template.name}</span> Template
            </h1>
            <Link
              href="/admin/templates"
              title="Templates"
              className="p-2 hover:text-cyan-400 transition-colors duration-300"
            >
              <Icon icon="solar:backspace-line-duotone" fontSize={36} />
            </Link>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} id="editUser">
            <fieldset className="flex flex-col gap-4">
              <div className="flex p-7 flex-col gap-4 border border-gray-100 rounded-xl bg-white">
                <h2 className="font-semibold">Header Image</h2>
                <fieldset className="flex flex-col items-center gap-4 w-full">
                  <UploaderTemplateImageUploader
                    templateId={id}
                    imageFileName="header_image_url"
                    userId={template.user_id}
                    fileNamePrefix="header"
                    mutate={mutateTemplate}
                    templateImageUrl={template.header_image_url}
                  />
                </fieldset>
              </div>
              <div className="flex p-7 flex-col gap-4 border border-gray-100 rounded-xl bg-white">
                <h2 className="font-semibold">Sign Image</h2>
                <fieldset className="flex items-center gap-4 w-full">
                  <UploaderTemplateImageUploader
                    templateId={id}
                    imageFileName="sign_image_url"
                    userId={template.user_id}
                    previewImageWidth="120pt"
                    fileNamePrefix="sign"
                    templateImageUrl={template.sign_image_url}
                    mutate={mutateTemplate}
                  />
                </fieldset>
              </div>
              <div className="flex p-7 flex-col gap-4 border border-gray-100 rounded-xl bg-white">
                <h2 className="font-semibold">Footer Image</h2>
                <fieldset className="flex items-center gap-4 w-full">
                  <UploaderTemplateImageUploader
                    templateId={id}
                    imageFileName="footer_image_url"
                    userId={template.user_id}
                    fileNamePrefix="footer"
                    templateImageUrl={template.footer_image_url}
                    mutate={mutateTemplate}
                  />
                </fieldset>
              </div>
              <div className="flex p-7 flex-col gap-4 border border-gray-100 rounded-xl bg-white">
                <h2 className="font-semibold">General Information</h2>
                <div>
                  <label htmlFor="name" className="inline-block mb-2 text-sm">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    {...register("name")}
                    required
                    className="w-full px-4 bg-white py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="description"
                    className="inline-block mb-2 text-sm"
                  >
                    Description
                  </label>
                  <input
                    type="text"
                    id="description"
                    {...register("description")}
                    required
                    className="w-full bg-white px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
                  />
                </div>
              </div>
            </fieldset>
            <footer className="flex items-center gap-3.5 justify-end mt-6 pt-6">
              <Link
                href="/admin/templates"
                className="font-semibold  disabled:border-gray-100 disabled:bg-gray-100 inline-block py-3 px-10 bg-white text-sm border border-gray-100 rounded-lg transition-colors hover:border-gray-200 duration-500 active:border-gray-300"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="text-white font-semibold disabled:border-gray-100 disabled:bg-gray-100 inline-block py-3 px-10 text-sm bg-cyan-500 hover:bg-cyan-400 transition-colors duration-500 rounded-lg"
              >
                Save
              </button>
            </footer>
          </form>
        </>
      )}
    </>
  );
}
