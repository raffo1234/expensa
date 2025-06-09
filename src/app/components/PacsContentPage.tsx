"use client";

import useCheckPermission from "@/hooks/useCheckPermission";
import { Permissions } from "@/types/propertyState";
import PacsQuery from "./PacsQuery";

export default function PacsPageContent({
  userRoleId,
}: {
  userRoleId: string;
}) {
  const { hasPermission: canManagePacs, isLoading: isLoading } =
    useCheckPermission(userRoleId, Permissions.MANAGE_PACS);

  if (isLoading) return "loading ...";
  if (!canManagePacs) return null;

  return (
    <>
      <div className="border border-gray-200 rounded-xl bg-white border-gray-200">
        <div className="border-b border-gray-200 flex gap-3.5 first:rounded-t-xl items-center justify-between text-left transition-colors duration-300 pl-6 pr-20 py-4">
          <span className="flex gap-3.5 items-center">
            <span>168.678.67.789</span>
            <span className="text-sm text-gray-500">4309</span>
            <span className="text-sm text-gray-500">GRUPOQUITO</span>
          </span>
        </div>
        <div className="border-b border-gray-200 flex gap-3.5 first:rounded-t-xl items-center justify-between text-left transition-colors duration-300 pl-6 pr-20 py-4">
          <span className="flex gap-3.5 items-center">
            <span>Pac n</span>
            <span className="text-sm text-gray-500">Description</span>
          </span>
        </div>
        <div className="flex gap-3.5 first:rounded-t-xl items-center justify-between text-left transition-colors duration-300 pl-6 pr-20 py-4">
          <span className="flex gap-3.5 items-center">
            <span>Pac n</span>
            <span className="text-sm text-gray-500">Description</span>
          </span>
        </div>
      </div>
      <PacsQuery userRoleId={userRoleId} />
    </>
  );
}
