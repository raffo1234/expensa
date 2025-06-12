"use client";

import { Icon } from "@iconify/react";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { mutate } from "swr";
import PrimaryButton from "./PrimaryButton";
import { adminPacsKey } from "@/constants";

type Inputs = {
  ip: string;
  port: string;
  institution_name: string;
  aet_server: string;
  aet_client: string;
  user_id: string;
};

export default function AddPac({ userId }: { userId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [displayForm, setDisplayForm] = useState(false);
  const { reset, register, handleSubmit } = useForm<Inputs>({ mode: "onBlur" });

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setIsLoading(true);
    data.user_id = userId;

    await supabase.from("pac").insert([data]);
    await mutate(adminPacsKey);
    reset();
    setDisplayForm(false);
    setIsLoading(false);
  };

  return (
    <>
      {displayForm ? (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="w-full items-center text-left hover:bg-gray-50 rounded-bl-xl rounded-br-xl transition-all duration-300 px-7 pt-4 pb-6 border-t border-gray-200"
        >
          <fieldset className="flex flex-col gap-4">
            <div className="flex-grow-1">
              <label htmlFor="institution_name" className="block mb-2 text-sm">
                Institution Name
              </label>
              <input
                type="text"
                id="institution_name"
                {...register("institution_name")}
                required
                className="bg-white w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
              />
            </div>
            <div className="flex gap-3.5 items-center">
              <div className="flex-grow-1">
                <label htmlFor="ip" className="block mb-2 text-sm">
                  IP
                </label>
                <input
                  type="text"
                  id="ip"
                  {...register("ip")}
                  required
                  className="bg-white w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
                />
              </div>
              <div className="flex-grow-1">
                <label htmlFor="port" className="block mb-2 text-sm">
                  Port
                </label>
                <input
                  type="text"
                  id="port"
                  {...register("port")}
                  required
                  className="bg-white w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
                />
              </div>
            </div>
            <div className="flex gap-3.5 items-center">
              <div className="flex-1">
                <label htmlFor="aet_server" className="block mb-2 text-sm">
                  AET Server
                </label>
                <input
                  type="text"
                  id="aet_server"
                  {...register("aet_server")}
                  required
                  className="bg-white w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="aet_client" className="block mb-2 text-sm">
                  AET Client
                </label>
                <input
                  type="text"
                  id="aet_client"
                  {...register("aet_client")}
                  required
                  className="bg-white w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
                />
              </div>
            </div>
          </fieldset>
          <div className="flex items-center gap-2 border-t border-gray-200 mt-6 pt-6">
            <button
              onClick={() => setDisplayForm(false)}
              type="button"
              title="Cancel"
              className="cursor-pointer font-semibold disabled:border-gray-100 disabled:bg-gray-100 inline-block py-3 px-10 bg-white text-sm border border-gray-100 rounded-lg transition-colors hover:border-gray-200 duration-500 active:border-gray-300"
            >
              Cancel
            </button>
            <PrimaryButton type="submit" label="Add" isLoading={isLoading} />
          </div>
        </form>
      ) : (
        <button
          title="Add"
          onClick={() => setDisplayForm((prev) => !prev)}
          className="w-full cursor-pointer flex rounded-b-xl gap-3.5 items-center text-left hover:bg-gray-50 transition-colors duration-300 px-6 py-4 border-t border-gray-200"
        >
          <Icon icon="solar:add-square-broken" fontSize={22} />
          <span className="pb-1">Add</span>
        </button>
      )}
    </>
  );
}
