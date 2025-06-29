import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { UserType } from "@/types/userType";
import toast from "react-hot-toast";
import AssignDicomItem from "./AssignDicomItem";
import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Icon } from "@iconify/react/dist/iconify.js";
import { ICON_SIZE } from "@/constants";
import NavigationInstructions from "./NavigationInstructions";

type UserWithAssignment = UserType & {
  isAssigned: boolean;
};

export type UserWithDicomAssignments = {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  image_url: string | null;
  role_name: string;
  is_assigned: boolean;
  assigned_dicom_ids: string[];
};

type FetchArgs = {
  page: number;
  pageSize: number;
  search?: string;
};

type FetchResult = {
  data: UserWithDicomAssignments[];
  count: number;
};

export const fetchUsersWithAssignmentFlag = async (
  dicomId: string
): Promise<UserWithAssignment[]> => {
  const { data: allUsers, error: allUsersError } = await supabase.from("user")
    .select(`
    id,
    email,
    first_name,
    last_name,
    image_url,
    username,
    role_id,
    role:role_id (
      id,
      name,
      description
    )
  `);

  const { data: assignedRows, error: assignedError } = await supabase
    .from("dicom_user")
    .select("user_id")
    .eq("dicom_id", dicomId);

  if (allUsersError || assignedError) {
    console.error("Error fetching users", allUsersError || assignedError);
    toast.error("Error fetching users");
    throw allUsersError || assignedError;
  }

  const assignedIds = new Set((assignedRows ?? []).map((r) => r.user_id));

  return (allUsers ?? []).map((user) => {
    const role = Array.isArray(user.role) ? user.role[0] : user.role;

    return {
      ...user,
      role: role,
      isAssigned: assignedIds.has(user.id),
    };
  });
};

export async function fetchUsersWithDicomAssignments({
  page,
  pageSize,
  search,
}: FetchArgs): Promise<FetchResult> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("users_with_dicom_assignments")
    .select("*", { count: "exact" })
    .range(from, to);

  if (search && search.trim() !== "") {
    const searchTerm = `%${search.trim()}%`;
    query = query.or(
      `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},role_name.ilike.${searchTerm}`
    );
  }

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    data: (data as UserWithDicomAssignments[]) ?? [],
    count: count ?? 0,
  };
}

export default function AssignDicomTo({
  dicomIds,
  userId,
}: {
  dicomIds: string[];
  userId: string;
}) {
  const PAGE_SIZE = 9;
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const { data, error, isLoading, mutate } = useSWR(
    ["users_with_dicom_assignments", page, search],
    () => fetchUsersWithDicomAssignments({ page, pageSize: PAGE_SIZE, search })
  );

  const debouncedSearchInput = useDebouncedCallback((event) => {
    setPage(0);
    setSearch(event.target.value);
  }, 350);

  const users = data?.data ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === "ArrowRight") {
        setPage((p) => (p + 1 < totalPages ? p + 1 : p));
      } else if (e.shiftKey && e.key === "ArrowLeft") {
        setPage((p) => (p > 0 ? p - 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [totalPages]);

  if (error) return null;

  return (
    <>
      <h1 className="font-semibold text-xl mb-1">Assign Studies to Users</h1>
      <p className="mb-8 text-gray-400 text-sm">
        They will be granted access to the files as part of this study.
      </p>
      <input
        onChange={debouncedSearchInput}
        placeholder="Search users"
        className="bg-white mb-6 w-full rounded-lg border border-gray-200 outline-0 px-5 py-2 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
      />
      <NavigationInstructions />
      <div className="my-3 flex justify-end items-center">
        <button
          disabled={page === 0}
          onClick={() => setPage((p) => p - 1)}
          className="px-4 py-1 bg-cyan-400 disabled:pointer-events-none text-white rounded-full disabled:opacity-50 cursor-pointer text-sm"
        >
          <Icon icon="solar:arrow-left-linear" fontSize={ICON_SIZE}></Icon>
        </button>
        <div className="text-xs uppercase font-semibold px-3">
          Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}
        </div>
        <button
          disabled={(page + 1) * PAGE_SIZE >= total}
          onClick={() => setPage((p) => p + 1)}
          className="px-4 py-1 bg-cyan-400 disabled:pointer-events-none text-white rounded-full disabled:opacity-50 cursor-pointer text-sm"
        >
          <Icon icon="solar:arrow-right-linear" fontSize={ICON_SIZE}></Icon>
        </button>
      </div>
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
        }}
      >
        {isLoading ? (
          <>
            <div
              className={`bg-gray-100 h-[174px] rounded-2xl animate-pulse`}
            />
            <div
              className={`bg-gray-100 h-[174px] rounded-2xl animate-pulse`}
            />
            <div
              className={`bg-gray-100 h-[174px] rounded-2xl animate-pulse`}
            />
          </>
        ) : (
          users?.map((user: UserWithDicomAssignments) => {
            return (
              <AssignDicomItem
                key={user.user_id}
                dicomIds={dicomIds}
                userId={userId}
                user={user}
                mutate={mutate}
              />
            );
          })
        )}
      </div>
    </>
  );
}
