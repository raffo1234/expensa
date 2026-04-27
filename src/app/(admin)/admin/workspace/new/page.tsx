"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createWorkspace } from "@/actions/workspace";

// ── Slug generator ─────────────────────────────────────────────────────────
function toSlug(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ── Icons ──────────────────────────────────────────────────────────────────
const BackIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M19 12H5M12 5l-7 7 7 7" />
  </svg>
);
const CheckIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <path d="M20 6L9 17l-5-5" />
  </svg>
);
const SpinnerIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    style={{ animation: "spin 0.8s linear infinite" }}
  >
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        style={{
          fontSize: 13.5,
          fontWeight: 600,
          color: "#374151",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {label}
      </label>
      {children}
      {hint && (
        <p
          style={{ margin: 0, fontSize: 12, color: "#9ca3af", fontFamily: "'DM Sans', sans-serif" }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function NewWorkspacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugEdited) setSlug(toSlug(val));
  };

  const handleSlugChange = (val: string) => {
    setSlugEdited(true);
    setSlug(toSlug(val));
  };

  const isValid = name.trim().length >= 2 && slug.length >= 2;

  const handleSubmit = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    setError(null);

    try {
      await createWorkspace(name.trim(), slug);
      setSuccess(true);
      setTimeout(() => router.push("/admin/workspace"), 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Algo salió mal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "'DM Sans', sans-serif" }}>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "48px 24px" }}>
        {/* Back */}
        <Link
          href="/admin/workspace"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13.5,
            color: "#6b7280",
            textDecoration: "none",
            marginBottom: 28,
            fontWeight: 500,
          }}
        >
          <BackIcon /> Volver a workspaces
        </Link>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              color: "#111827",
              letterSpacing: "-0.4px",
            }}
          >
            Nuevo Workspace
          </h1>
          <p style={{ margin: "5px 0 0", fontSize: 14, color: "#6b7280" }}>
            Los workspaces te ayudan a organizar tus proyectos y equipo.
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "#fff",
            border: "1.5px solid #e5e7eb",
            borderRadius: 14,
            padding: "28px 26px",
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          {/* Name */}
          <Field label="Nombre del workspace" hint="Mínimo 2 caracteres.">
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="ej. Sistema de Diseño"
              maxLength={60}
              style={{
                padding: "10px 13px",
                border: "1.5px solid #e5e7eb",
                borderRadius: 9,
                fontSize: 14,
                color: "#111827",
                outline: "none",
                fontFamily: "'DM Sans', sans-serif",
                transition: "border-color 0.15s",
                background: "#fff",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#06b6d4")}
              onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
            />
          </Field>

          {/* Slug */}
          <Field
            label="Slug"
            hint="Se usa en las URLs. Se genera automáticamente — o personalízalo."
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                border: "1.5px solid #e5e7eb",
                borderRadius: 9,
                overflow: "hidden",
                background: "#fff",
              }}
            >
              <span
                style={{
                  padding: "10px 10px 10px 13px",
                  fontSize: 14,
                  color: "#9ca3af",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                /workspace/
              </span>
              <input
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="mi-workspace"
                maxLength={60}
                style={{
                  flex: 1,
                  padding: "10px 13px 10px 0",
                  border: "none",
                  fontSize: 14,
                  color: "#111827",
                  outline: "none",
                  fontFamily: "'DM Sans', sans-serif",
                  background: "transparent",
                }}
              />
            </div>
          </Field>

          {/* Preview */}
          {name && (
            <div
              style={{
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: 8,
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {name[0]?.toUpperCase()}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0e7490" }}>{name}</p>
                <p style={{ margin: 0, fontSize: 11.5, color: "#22d3ee" }}>/{slug || "…"}</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p style={{ margin: 0, fontSize: 13, color: "#ef4444", fontWeight: 500 }}>{error}</p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!isValid || loading || success}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "11px 18px",
              borderRadius: 10,
              border: "none",
              background: success ? "#10b981" : !isValid ? "#e5e7eb" : "#06b6d4",
              color: !isValid ? "#9ca3af" : "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: isValid && !loading && !success ? "pointer" : "not-allowed",
              fontFamily: "'DM Sans', sans-serif",
              transition: "background 0.2s",
              boxShadow: isValid && !loading ? "0 2px 8px rgba(6,182,212,0.2)" : "none",
            }}
          >
            {success ? (
              <>
                <CheckIcon /> ¡Creado!
              </>
            ) : loading ? (
              <>
                <SpinnerIcon /> Creando…
              </>
            ) : (
              "Crear Workspace"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
