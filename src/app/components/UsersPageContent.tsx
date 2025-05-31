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
}) => {
  const { data: users, error, isLoading } = useSWR("users", userFetcher);

  if (isLoading) return <div>Loading users...</div>;
  if (error) return <div>Error loading users</div>;
  if (!users) return null;

  return <UsersTable currentUserId={currentUserId} users={users} />;
};

export default UsersPageContent;
