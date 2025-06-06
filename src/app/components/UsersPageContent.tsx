"use client";

import UsersTable from "@/components/UsersTable";
import userFetcher from "@/fetchers/userFetcher";
import useSWR from "swr";

interface UsersPageContentProps {
  currentUserId: string;
  userRoleId: string;
}

const UsersPageContent: React.FC<UsersPageContentProps> = ({
  currentUserId,
  userRoleId,
}) => {
  const {
    data: users,
    error,
    isLoading,
    mutate,
  } = useSWR("users", userFetcher);

  if (isLoading) return <div>Loading users...</div>;
  if (error) return <div>Error loading users</div>;
  if (!users) return null;

  return (
    <UsersTable
      mutateUsers={mutate}
      currentUserId={currentUserId}
      users={users}
      userRoleId={userRoleId}
    />
  );
};

export default UsersPageContent;
