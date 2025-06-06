"use client";

import UsersTable from "@/components/UsersTable";
import userFetcher from "@/fetchers/userFetcher";
import useSWR from "swr";

const UsersPageContent = () => {
  const { data: users, error, isLoading } = useSWR("users", userFetcher);

  if (isLoading) return <div>Loading users...</div>;
  if (error) return <div>Error loading users</div>;
  if (!users) return null;

  return <UsersTable users={users} />;
};

export default UsersPageContent;
