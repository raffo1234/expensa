import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import MySettings from "@/components/MySettings";

export default async function Page() {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    redirect("/");
  }

  return (
    <main className="p-6">
      <h1 className="mb-6 font-semibold text-lg block">My Settings</h1>
      <MySettings userId={user.id} />
    </main>
  );
}
