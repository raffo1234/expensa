"use client";

import useCheckPermission from "@/hooks/useCheckPermission";

export default function CheckPermission({
  userRoleId,
  requiredPermission,
  children,
  fallback = null,
  loadingComponent = null,
}: {
  userRoleId: string;
  requiredPermission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
}) {
  const { hasPermission, isLoading } = useCheckPermission(
    userRoleId,
    requiredPermission
  );

  if (isLoading) {
    if (loadingComponent) return loadingComponent;

    return (
      <span className="relative flex size-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
      </span>
    );
  }

  if (!hasPermission) return fallback;
  if (hasPermission) return children;

  return null;
}
