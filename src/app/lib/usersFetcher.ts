import { UserType } from "@/types/userType";
import { supabase } from "./supabase";

const usersFetcher = async () => {
  const { data } = (await supabase
    .from("user")
    .select("*, role(name)")
    .order("first_name", { ascending: true })) as { data: UserType[] | null };
  return data;
};

export default usersFetcher;
