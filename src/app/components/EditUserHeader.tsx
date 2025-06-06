import { UserType } from "@/types/userType";
import Image from "next/image";

export default function EditUserHeader({ user }: { user: UserType }) {
  return (
    <h2 className="flex gap-2 items-center mb-6 font-semibold text-lg">
      <Image
        src={user.image_url}
        width={50}
        height={50}
        alt={user.first_name as string}
        className="rounded-full"
      />
      <span>
        {user.first_name} {user.last_name}
        <span className="text-sm block text-gray-500 font-normal">
          {user.role?.name}
        </span>
      </span>
    </h2>
  );
}
