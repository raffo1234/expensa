"use client";

import { useEffect, useMemo } from "react";
import Select, { SingleValue, components, OptionProps, SingleValueProps } from "react-select";
import { UserType } from "@/types/userType";

interface UsersSelectorProps {
  users: UserType[] | null | undefined;
  activeUserId: string;
  onChange: (userId: string) => void;
  localStorageKey?: string;
}

interface UserOption {
  value: string;
  label: string;
  roleName: string;
  fullName: string;
  email: string;
}

const UserOptionLabel = ({ roleName, fullName, email }: UserOption) => (
  <div className="flex flex-col py-1">
    <div className="flex justify-between items-center font-semibold">
      <span>{fullName}</span>
      <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700">{roleName}</span>
    </div>
    <div className="text-xs opacity-70 mt-0.5">{email}</div>
  </div>
);

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

  const options: UserOption[] = useMemo(
    () =>
      users?.map((user) => ({
        value: user.id,
        label: `(${user.role?.name ?? "No role"}) - ${user.first_name} ${
          user.last_name
        } (${user.email})`,
        roleName: user.role?.name ?? "No role",
        fullName: `${user.first_name ?? ""} ${user.last_name ?? ""}`,
        email: user.email,
      })) ?? [],
    [users],
  );

  const currentOption = options.find((opt) => opt.value === activeUserId) ?? null;

  const CustomOption = (props: OptionProps<UserOption, false>) => (
    <components.Option {...props}>
      <UserOptionLabel {...props.data} />
    </components.Option>
  );

  const CustomSingleValue = (props: SingleValueProps<UserOption, false>) => (
    <components.SingleValue {...props}>
      <UserOptionLabel {...props.data} />
    </components.SingleValue>
  );

  const handleChange = (option: SingleValue<UserOption>) => {
    onChange(option?.value ?? "");
  };

  return (
    <div className="relative max-w-120 mb-6 w-full">
      <Select<UserOption, false>
        unstyled
        value={currentOption}
        onChange={handleChange}
        options={options}
        isSearchable
        placeholder="Select a user..."
        classNamePrefix="user-select"
        components={{
          Option: CustomOption,
          SingleValue: CustomSingleValue,
        }}
        classNames={{
          control: ({ isFocused }) =>
            [
              "rounded-xl border px-2 py-1 min-h-[42px] cursor-pointer transition-all duration-150",
              isFocused
                ? "border-cyan-500 ring-4 ring-cyan-100"
                : "border-gray-200 hover:border-cyan-400",
            ].join(" "),
          valueContainer: () => "px-1",
          placeholder: () => "text-gray-400",
          menu: () =>
            "mt-1 rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20 bg-white",
          option: ({ isSelected, isFocused }) =>
            [
              "px-3 py-2 cursor-pointer",
              isSelected ? "bg-cyan-400 text-white" : isFocused ? "bg-cyan-50" : "",
            ].join(" "),
          singleValue: () => "text-gray-900 font-medium",
          input: () => "text-gray-900",
          dropdownIndicator: () => "text-gray-500",
        }}
      />
    </div>
  );
}
