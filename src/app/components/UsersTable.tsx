import DeleteUser from "@/components/DeleteUser";
import EditUser from "@/components/EditUser";
import { UserType } from "@/types/userType";
import Image from "next/image";
import { UUIDTypes } from "uuid";

export default function UsersTable({
  currentUserId,
  users,
  mutateUsers,
}: {
  currentUserId: UUIDTypes;
  users: UserType[] | null;
  mutateUsers: () => void;
}) {
  return (
    <div className="max-w-[1200px] mx-auto w-full">
      <h1 className="mb-6 font-semibold text-lg block">Users</h1>
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
        }}
      >
        {users?.map(({ first_name, last_name, id, role, image_url }) => {
          return (
            <div
              key={id}
              className="border bg-white border-gray-200 hover:bg-gray-50 rounded-2xl p-4"
            >
              <Image
                src={image_url}
                className="rounded-full mb-3 mx-auto bg-gray-100"
                alt={first_name || id}
                width={44}
                height={44}
                title={first_name}
              />
              <div
                className="font-semibold w-full mb-1 text-center truncate"
                title={first_name}
              >
                {first_name} {last_name}
              </div>
              <div className="text-sm text-gray-500 w-full text-center mb-4">
                {role?.name}
              </div>
              <div className="flex gap-2 items-center justify-center">
                <EditUser
                  mutateUsers={mutateUsers}
                  currentUserId={currentUserId}
                  userId={id}
                />
                <DeleteUser userId={id} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
