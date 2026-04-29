"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWorkspace } from "@/actions/workspace";
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, STYLED_ICON_CLASS } from "@/constants";
import Field from "@/components/Field";
import FormSection from "@/components/FormSection";
import BackLink from "@/components/BackLink";
import FormInnerSection from "@/components/FormInnerSection";

function toSlug(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

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
    className="animate-spin"
  >
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

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
      setTimeout(() => router.push("/admin/workspaces"), 1000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Algo salió mal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <BackLink href="/admin/workspaces">Volver a workspaces</BackLink>

      <div className="mb-10 mt-6">
        <h1 className="text-4xl font-bold mb-1">Nuevo Workspace</h1>
        <p className="text-slate-500">
          Los workspaces te ayudan a organizar tus proyectos y equipo.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <FormSection>
          <div className="space-y-6">
            <Field label="Nombre del workspace" hint="Mínimo 2 caracteres.">
              <input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="ej. Sistema de Diseño"
                maxLength={60}
                className={INPUT_CLASS}
              />
            </Field>

            <Field
              label="Slug"
              hint="Se usa en las URLs. Se genera automáticamente — o personalízalo."
            >
              <div className="flex items-center">
                <span className="px-3 py-2.5 text-sm text-gray-400 select-none whitespace-nowrap">
                  /workspaces/
                </span>
                <input
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="mi-workspace"
                  maxLength={60}
                  className={INPUT_CLASS}
                />
              </div>
            </Field>

            {name && (
              <FormInnerSection>
                <div className="flex items-center gap-3">
                  <div className={STYLED_ICON_CLASS}>{name[0]?.toUpperCase()}</div>
                  <div>
                    <p className="text-sm font-semibold">{name}</p>
                    <p className="text-sm text-purple-800">/{slug || "…"}</p>
                  </div>
                </div>
              </FormInnerSection>
            )}

            {error && <p className="text-sm font-medium text-red-500">{error}</p>}

            <button
              disabled={!isValid || loading || success}
              type="submit"
              className={PRIMARY_BUTTON_CLASS}
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
        </FormSection>
      </form>
    </div>
  );
}
