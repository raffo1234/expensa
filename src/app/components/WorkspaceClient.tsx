"use client";

import toast from "react-hot-toast";
import { useState } from "react";
import Link from "next/link";
import { Workspace } from "@/types/WorkspaceType";
import { PRIMARY_BUTTON_CLASS } from "@/constants";
import DeleteButton from "./DeleteButton";
import SearchInput from "./SearchInput";
import ClearFiltersButton from "./ClearFiltersButton";
import ListPage from "./ListPage";
import PageNavigator from "./PageNavigator";
import DataTable, { DataTableRow, RowLink, Td } from "./DataTable";
import { useClientPagination } from "@/hooks/useClientPagination";
import { deleteWorkspace } from "@/actions/workspace";
import { WORKSPACE_COLUMNS } from "@/lib/tableColumns";

const PlusIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M5 12h14M12 5v14" />
  </svg>
);

export default function WorkspaceClient({
  workspaces: initial,
  currentUserId,
  canCreateExpense,
}: {
  workspaces: Workspace[];
  /** Role may add expenses (shows the row's "+ Gasto" button). */
  canCreateExpense: boolean;
  /** Only a project's creator may delete it (the server enforces this too). */
  currentUserId: string;
}) {
  const [workspaces, setWorkspaces] = useState(initial);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const q = search.trim().toLowerCase();
  const filtered = workspaces.filter(
    (ws) => ws.name.toLowerCase().includes(q) || ws.slug.toLowerCase().includes(q),
  );
  const { rows, start, pager } = useClientPagination(filtered, q);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteWorkspace(id);
      setWorkspaces((prev) => prev.filter((ws) => ws.id !== id));
      toast.success("Proyecto eliminado");
    } catch (err) {
      toast.error(
        err instanceof Error && err.message.includes("acceso")
          ? "Solo quien creó el proyecto puede eliminarlo."
          : "No se pudo eliminar el proyecto. Inténtalo de nuevo.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <ListPage
      pager={<PageNavigator {...pager} />}
      controls={
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-gray-600">{q ? "Proyectos encontrados" : "Proyectos"}</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 tabular-nums">
                {filtered.length}
              </p>
            </div>
            <Link
              href="/admin/workspaces/new"
              className={`${PRIMARY_BUTTON_CLASS} justify-center min-h-11`}
            >
              <PlusIcon />
              Nuevo proyecto
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar proyectos…"
              className="flex-1"
            />
            <ClearFiltersButton onClick={() => setSearch("")} disabled={!search} />
          </div>
        </>
      }
    >
      <DataTable
        columns={WORKSPACE_COLUMNS}
        numbered
        isEmpty={filtered.length === 0}
        emptyMessage={
          workspaces.length === 0
            ? "Aún no tienes proyectos."
            : `Ningún proyecto coincide con "${search}".`
        }
      >
        {rows.map((ws, i) => {
          const href = `/admin/workspaces/${ws.slug}/expenses`;
          const count = ws.expense?.length ?? 0;
          return (
            <DataTableRow
              key={ws.id}
              href={href}
              number={start + i + 1}
              className={deletingId === ws.id ? "pointer-events-none opacity-40" : ""}
            >
              <Td className="font-book text-navy-900">
                <RowLink href={href}>{ws.name}</RowLink>
              </Td>
              <Td className="font-mono">/{ws.slug}</Td>
              <Td align="right" className="tabular-nums">
                {count}
              </Td>
              <Td>
                {new Date(ws.created_at).toLocaleDateString("es-PE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </Td>
              <Td align="right">
                <div className="flex items-center justify-end gap-2">
                  {canCreateExpense && (
                    <Link
                      href={`/admin/workspaces/${ws.slug}/upload-expense`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-violet-50 hover:text-violet-700"
                    >
                      <PlusIcon />
                      Gasto
                    </Link>
                  )}
                  {ws.created_by === currentUserId && (
                    <DeleteButton
                      title="Eliminar proyecto"
                      confirmTitle="¿Eliminar proyecto?"
                      confirmDescription="Se eliminarán todos los gastos y archivos adjuntos. Esta acción no se puede deshacer."
                      confirmLabel="Eliminar"
                      cancelLabel="Cancelar"
                      isDeleting={deletingId === ws.id}
                      onClick={() => handleDelete(ws.id)}
                    />
                  )}
                </div>
              </Td>
            </DataTableRow>
          );
        })}
      </DataTable>
    </ListPage>
  );
}
