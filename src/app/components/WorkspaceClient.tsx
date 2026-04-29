"use client";

import { useState } from "react";
import Link from "next/link";
import { Workspace } from "@/types/WorkspaceType";
import { PRIMARY_BUTTON_CLASS, SEARCH_INPUT_CLASS } from "@/constants";
import FormSection from "./FormSection";
import DeleteButton from "./DeleteButton";
import { deleteWorkspace } from "@/actions/workspace";
import SectionTitle from "./SectionTitle";
import TitleWrapper from "./TitleWrapper";
import BackLink from "./BackLink";

const PlusIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

// ── Table View ─────────────────────────────────────────────────────────────
function TableView({
  workspaces,
  onDelete,
}: {
  workspaces: Workspace[];
  onDelete: (id: string) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteWorkspace(id);
      onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <FormSection padding={false}>
      <div className="overflow-hidden">
        <div className="overflow-y-auto max-h-[60vh]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 sticky top-0 z-10">
                {["Workspace", "Slug", "Gastos", "Creado", ""].map((h, i) => (
                  <th key={i} className="px-6 py-4 text-left text-sm">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {workspaces.map((ws) => (
                <tr
                  key={ws.id}
                  className="border-b border-purple-100 last:border-0 hover:bg-violet-50/60 transition-colors duration-150"
                >
                  <td className="px-6 py-5 font-semibold text-[15px] text-gray-800">{ws.name}</td>
                  <td className="px-6 py-5 text-sm text-gray-500 font-medium">/{ws.slug}</td>
                  <td className="px-6 py-5 text-sm text-gray-500 font-medium">
                    {ws.expense?.length ?? 0} gasto{ws.expense?.length === 1 ? "" : "s"}
                  </td>
                  <td className="px-6 py-5 text-sm text-gray-500 font-medium">
                    {new Date(ws.created_at).toLocaleDateString("es-PE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        href={`/admin/workspaces/${ws.slug}/upload-expense`}
                        className="text-xs font-semibold text-gray-500 hover:text-gray-600 transition-colors px-3 py-1.5 rounded-full border border-gray-200 hover:border-gray-300"
                      >
                        + Agregar
                      </Link>
                      <Link
                        href={`/admin/workspaces/${ws.slug}/expenses`}
                        className="text-xs font-bold text-white bg-gray-900 hover:bg-gray-700 transition-colors px-4 py-1.5 rounded-full"
                      >
                        Ver gastos
                      </Link>
                      <DeleteButton
                        title="Eliminar workspace"
                        confirmTitle="¿Eliminar workspace?"
                        confirmDescription="Se eliminarán todos los gastos y archivos adjuntos. Esta acción no se puede deshacer."
                        confirmLabel="Eliminar"
                        cancelLabel="Cancelar"
                        isDeleting={deletingId === ws.id}
                        onClick={() => handleDelete(ws.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </FormSection>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function WorkspaceClient({ workspaces: initial }: { workspaces: Workspace[] }) {
  const [workspaces, setWorkspaces] = useState(initial);
  const [search, setSearch] = useState("");

  const handleDelete = (id: string) => {
    setWorkspaces((prev) => prev.filter((ws) => ws.id !== id));
  };

  const filtered = workspaces.filter(
    (ws) =>
      ws.name.toLowerCase().includes(search.toLowerCase()) ||
      ws.slug.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <BackLink href="/">Home</BackLink>
      <TitleWrapper>
        <SectionTitle>Workspaces</SectionTitle>
        <p className="text-sm text-gray-500">
          {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
        </p>
      </TitleWrapper>
      <Link href="/admin/workspaces/new" className={PRIMARY_BUTTON_CLASS}>
        <PlusIcon /> Nuevo Workspace
      </Link>
      <div className="relative my-6">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar workspaces…"
          className={SEARCH_INPUT_CLASS}
        />
      </div>

      {workspaces.length === 0 && (
        <div className="text-center py-20">
          <p className="text-[15px] text-gray-400 mb-4">Aún no tienes workspaces</p>
          <Link href="/admin/workspaces/new" className="no-underline">
            <button className="inline-flex items-center gap-2 bg-cyan-500 text-white border-none rounded-[10px] px-[18px] py-2.5 font-semibold text-sm cursor-pointer">
              <PlusIcon /> Crear mi primer workspace
            </button>
          </Link>
        </div>
      )}

      {workspaces.length > 0 && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-[15px] m-0">Ningún workspace coincide con &quot;{search}&quot;</p>
        </div>
      )}

      {filtered.length > 0 && <TableView workspaces={filtered} onDelete={handleDelete} />}
    </div>
  );
}
