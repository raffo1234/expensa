"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import useCheckPermission from "@/hooks/useCheckPermission";
import { Permissions } from "@/types/propertyState";

export default function Aside({
  userRoleId,
  userName,
  userImage,
}: {
  userRoleId: string;
  userName: string;
  userImage: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const currentPath = usePathname();

  const {
    hasPermission: hasRolesPermission,
    isLoading: isLoadingRolesPermission,
  } = useCheckPermission(userRoleId, Permissions.ADMINISTRAR_ROLES);
  const {
    hasPermission: hasUsersPermission,
    isLoading: isLoadingUsersPermission,
  } = useCheckPermission(userRoleId, Permissions.ADMINISTRAR_USUARIOS);
  const {
    hasPermission: hasPermissionsPermission,
    isLoading: isLoadingPermissionsPermission,
  } = useCheckPermission(userRoleId, Permissions.ADMINISTRAR_PERMISOS);

  const pages = [
    {
      href: "/admin/dicom",
      title: "Upload Files",
      iconName: "solar:cloud-upload-broken",
    },
    {
      href: "/admin/dicoms",
      title: "Dicoms",
      iconName: "solar:bones-broken",
    },
    {
      href: "/admin/templates",
      title: "Templates",
      iconName: "solar:file-favourite-line-duotone",
    },
    ...(hasUsersPermission
      ? [
          {
            href: "/admin/users",
            title: "Users",
            iconName: "solar:user-linear",
          },
        ]
      : []),
    ...(hasRolesPermission
      ? [
          {
            href: "/admin/roles",
            title: "Roles",
            iconName: "solar:user-check-broken",
          },
        ]
      : []),
    ...(hasPermissionsPermission
      ? [
          {
            href: "/admin/permisos",
            title: "Permissions",
            iconName: "solar:lock-keyhole-broken",
          },
        ]
      : []),
  ];

  const closeMenu = () => {
    return setIsOpen(false);
  };

  if (
    isLoadingRolesPermission ||
    isLoadingUsersPermission ||
    isLoadingPermissionsPermission
  )
    return null;

  return (
    <div className="flex-shrink-0">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`${
          isOpen ? "text-cyan-500" : ""
        } lg:invisible z-20 visible absolute right-2 top-4 bg-white w-12 h-12 border border-gray-200 rounded-xl flex justify-center items-center`}
      >
        <Icon icon="solar:hamburger-menu-broken" fontSize={24} />
      </button>
      <section
        className={`${
          isOpen
            ? "opacity-100 visible translate-x-0"
            : "invisible opacity-0 lg:visible lg:opacity-100 lg:translate-x-0 -translate-x-2"
        } transition-all lg:w-[286px] w-full absolute left-0 top-0 lg:static py-8 px-5 bg-white z-10`}
      >
        <header className="mb-20">
          <div className="flex gap-4 items-center">
            <Image
              src={userImage}
              alt={userName}
              className="rounded-full bg-neutral-200"
              height={48}
              width={48}
            />
            <div className="">
              <p className="text-sm leading-3 mb-1 text-gray-500">Welcome</p>
              <h3 className="font-semibold text-gray-700 text-lg">
                {userName}
              </h3>
            </div>
          </div>
        </header>
        <nav>
          <ul className="flex flex-col">
            {pages.map(({ href, title, iconName }) => (
              <li key={href}>
                <Link
                  href={href}
                  title={title}
                  className={`${
                    href === currentPath ? "bg-gray-100" : "hover:bg-gray-50"
                  }  rounded-xl py-3 px-4 gap-3.5 flex items-center transition-colors duration-300 `}
                  onClick={closeMenu}
                >
                  <Icon icon={iconName} fontSize={21} />
                  <span>{title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </section>
    </div>
  );
}
