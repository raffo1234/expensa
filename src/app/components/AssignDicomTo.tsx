import useSWR from "swr";
import { supabase } from "@/lib/supabase";
import { UserType } from "@/types/userType";
import toast from "react-hot-toast";
import AssignDicomItem from "./AssignDicomItem";

type UserWithAssignment = UserType & {
  isAssigned: boolean;
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

const fetchUsersWithDicomAssignments = async () => {
  const { data, error } = await supabase
    .from("users_with_dicom_assignments")
    .select("*");

  if (error) throw error;
  return data;
};

export default function AssignDicomTo({
  dicomIds,
  userId,
}: {
  dicomIds: string[];
  userId: string;
}) {
  const {
    data: users,
    error,
    isLoading,
    mutate,
  } = useSWR("users_with_dicom_assignments", fetchUsersWithDicomAssignments);

  if (error || isLoading) return null;
  
  return (
    <>
      <h1 className="font-semibold text-xl mb-1">Assign Studies to Users</h1>
      <p className="mb-8 text-gray-400 text-sm">
        They will be granted access to the files as part of this study.
      </p>
      <input
        placeholder="Search users"
        className="bg-white mb-6 w-full rounded-lg border border-gray-200 outline-0 px-5 py-2 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
      />
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
        }}
      >
        {users?.map((user) => {
          return (
            <AssignDicomItem
              key={user.id}
              dicomIds={dicomIds}
              userId={userId}
              user={user}
              mutate={mutate}
            />
          );
        })}
      </div>
    </>
  );
}
