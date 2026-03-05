import EditTemplate from "@/components/EditTemplate";
import { Suspense } from "react";

type Params = Promise<{ id: string }>;

export default async function Page({ params }: { params: Params }) {
  const { id } = await params;

  return (
    <Suspense>
      <EditTemplate id={id} />
    </Suspense>
  );
}
