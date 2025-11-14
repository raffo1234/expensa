export default function RoleName({ roleName }: { roleName: string }) {
  return (
    <p className="text-xs bg-cyan-100 px-2 py-0.5 w-fit mx-auto text-cyan-700 rounded-full">
      {roleName}
    </p>
  );
}
