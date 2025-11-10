"use client";

import { useEffect } from "react";
import { UserType } from "@/types/userType";
import { Icon } from "@iconify/react/dist/iconify.js";

interface UsersSelectorProps {
  users: UserType[] | null | undefined;
  activeUserId: string;
  onChange: (userId: string) => void;
  localStorageKey?: string;
}

export default function UsersSelector({
  users,
  activeUserId,
  onChange,
  localStorageKey = "activeUserId",
}: UsersSelectorProps) {
  useEffect(() => {
    const savedId = localStorage.getItem(localStorageKey);
    if (savedId && savedId !== activeUserId) {
      onChange(savedId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeUserId) {
      localStorage.setItem(localStorageKey, activeUserId);
    }
  }, [activeUserId, localStorageKey]);

  return (
    <div className="relative max-w-120 mb-6 w-full">
      <select
        value={activeUserId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-4 pr-7 py-2.5 rounded-xl border border-gray-200
                   focus:outline-none focus:ring-4 focus:ring-cyan-100
                   focus:border-cyan-500 bg-white"
      >
        {users?.map(({ id, first_name, role, last_name, email }) => (
          <option value={id} key={id}>
            ({role?.name ?? "No role"}) - {first_name} {last_name} ({email})
          </option>
        ))}
      </select>
      <div className="absolute top-1/2 -translate-y-1/2 right-1 pr-3 pointer-events-none bg-white">
        <Icon icon="solar:alt-arrow-down-linear" fontSize={16} />
      </div>
    </div>
  );
}
