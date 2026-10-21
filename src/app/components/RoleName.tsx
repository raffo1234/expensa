export default function RoleName({ roleName }: { roleName: string }) {
  return (
    <p className="text-xs bg-violet-100 px-2 py-0.5 w-fit mx-auto text-violet-700 rounded-full">
      {roleName}
    </p>
  );
}
