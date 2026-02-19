import DicomViewer from "@/components/DicomViewer";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id) return null;

  return (
    <main className="h-screen w-full bg-black overflow-hidden">
      <DicomViewer studyId={id} />
    </main>
  );
}
