import { supabase } from "./supabase";

const templateFetcher = async (id: string) => {
  const { data, error } = await supabase.from("template").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
};

export default templateFetcher;
