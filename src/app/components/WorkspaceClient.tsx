"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Workspace } from "@/types/WorkspaceType";

// ── Icons ──────────────────────────────────────────────────────────────────
const GridIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const ListIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
  >
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <circle cx="3" cy="6" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="3" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="3" cy="18" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);
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
const ArrowIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
const WorkspaceIcon = ({ char }: { char: string }) => (
  <div
    style={{
      width: 40,
      height: 40,
      borderRadius: 10,
      background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff",
      fontWeight: 700,
      fontSize: 16,
      flexShrink: 0,
      fontFamily: "'DM Sans', sans-serif",
    }}
  >
    {char}
  </div>
);

// ── Grid Card ──────────────────────────────────────────────────────────────
function GridCard({ ws }: { ws: Workspace }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        background: "#fff",
        border: `1.5px solid ${hovered ? "#06b6d4" : "#e5e7eb"}`,
        borderRadius: 14,
        padding: "24px 22px 20px",
        cursor: "pointer",
        transition: "border-color 0.18s, box-shadow 0.18s, transform 0.18s",
        boxShadow: hovered ? "0 4px 20px rgba(6,182,212,0.10)" : "0 1px 4px rgba(0,0,0,0.04)",
        transform: hovered ? "translateY(-2px)" : "none",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <Link href={`/admin/workspace/${ws.slug}/upload-expense`} style={{ textDecoration: "none" }}>
        <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
          <div
            style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}
          >
            <WorkspaceIcon char={ws.name[0].toUpperCase()} />
            <span
              style={{
                fontSize: 11,
                color: hovered ? "#06b6d4" : "#9ca3af",
                transition: "color 0.18s",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              New expense <ArrowIcon />
            </span>
          </div>
          <div>
            <p
              style={{
                margin: 0,
                fontWeight: 600,
                fontSize: 15,
                color: "#111827",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {ws.name}
            </p>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: 12,
                color: "#9ca3af",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              /{ws.slug}
            </p>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 11.5,
              color: "#9ca3af",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Creado {formatDistanceToNow(new Date(ws.created_at), { addSuffix: true, locale: es })}
          </p>
        </div>
      </Link>
      <Link
        href={`/admin/workspace/${ws.slug}/upload-expense`}
        style={{ textDecoration: "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          style={{
            fontSize: 12,
            color: "#06b6d4",
            fontWeight: 500,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          + Upload Expense
        </span>
      </Link>
    </div>
  );
}

// ── List Row ───────────────────────────────────────────────────────────────
function ListRow({ ws, isLast }: { ws: Workspace; isLast: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link href={`/admin/workspace/${ws.slug}`} style={{ textDecoration: "none" }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 18px",
          borderBottom: isLast ? "none" : "1px solid #f3f4f6",
          background: hovered ? "#f9fafb" : "transparent",
          cursor: "pointer",
          transition: "background 0.15s",
          borderRadius: isLast ? "0 0 12px 12px" : 0,
        }}
      >
        <WorkspaceIcon char={ws.name[0].toUpperCase()} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontWeight: 600,
              fontSize: 14,
              color: "#111827",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {ws.name}
          </p>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: 12,
              color: "#9ca3af",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            /{ws.slug}
          </p>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "#9ca3af",
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: "nowrap",
          }}
        >
          {formatDistanceToNow(new Date(ws.created_at), { addSuffix: true, locale: es })}
        </p>
        <Link
          href={`/admin/workspace/${ws.slug}/upload-expense`}
          style={{ textDecoration: "none" }}
          onClick={(e) => e.stopPropagation()}
        >
          <span
            style={{
              fontSize: 12,
              color: "#06b6d4",
              fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
              whiteSpace: "nowrap",
            }}
          >
            + Upload Expense
          </span>
        </Link>
        <span style={{ color: hovered ? "#06b6d4" : "#d1d5db", transition: "color 0.15s" }}>
          <ArrowIcon />
        </span>
      </div>
    </Link>
  );
}

// ── Main Client ────────────────────────────────────────────────────────────
export default function WorkspaceClient({ workspaces }: { workspaces: Workspace[] }) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");

  const filtered = workspaces.filter(
    (ws) =>
      ws.name.toLowerCase().includes(search.toLowerCase()) ||
      ws.slug.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 32,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 700,
                color: "#111827",
                letterSpacing: "-0.5px",
              }}
            >
              Workspaces
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "#6b7280" }}>
              {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link href="/admin/workspace/new" style={{ textDecoration: "none" }}>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#06b6d4",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "10px 18px",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: "0 2px 8px rgba(6,182,212,0.25)",
              }}
            >
              <PlusIcon /> Nuevo Workspace
            </button>
          </Link>
        </div>

        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar workspaces…"
            style={{
              flex: 1,
              minWidth: 180,
              padding: "9px 14px",
              border: "1.5px solid #e5e7eb",
              borderRadius: 9,
              fontSize: 14,
              color: "#111827",
              outline: "none",
              fontFamily: "'DM Sans', sans-serif",
              background: "#fff",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#06b6d4")}
            onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
          />
          <div
            style={{
              display: "flex",
              background: "#fff",
              border: "1.5px solid #e5e7eb",
              borderRadius: 9,
              overflow: "hidden",
            }}
          >
            {(["grid", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 38,
                  height: 38,
                  border: "none",
                  cursor: "pointer",
                  background: view === v ? "#f0f9ff" : "transparent",
                  color: view === v ? "#06b6d4" : "#9ca3af",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {v === "grid" ? <GridIcon /> : <ListIcon />}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state — no workspaces at all */}
        {workspaces.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ fontSize: 15, color: "#9ca3af", margin: "0 0 16px" }}>
              Aún no tienes workspaces
            </p>
            <Link href="/admin/workspace/new" style={{ textDecoration: "none" }}>
              <button
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#06b6d4",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 18px",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <PlusIcon /> Crear mi primer workspace
              </button>
            </Link>
          </div>
        )}

        {/* Empty state — search no match */}
        {workspaces.length > 0 && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "64px 0", color: "#9ca3af" }}>
            <p style={{ fontSize: 15, margin: 0 }}>
              Ningún workspace coincide con &quot;{search}&quot;
            </p>
          </div>
        )}

        {/* Grid view */}
        {view === "grid" && filtered.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            {filtered.map((ws) => (
              <GridCard key={ws.id} ws={ws} />
            ))}
          </div>
        )}

        {/* List view */}
        {view === "list" && filtered.length > 0 && (
          <div
            style={{
              background: "#fff",
              border: "1.5px solid #e5e7eb",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {filtered.map((ws, i) => (
              <ListRow key={ws.id} ws={ws} isLast={i === filtered.length - 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
