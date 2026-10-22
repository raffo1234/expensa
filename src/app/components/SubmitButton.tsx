import type { ButtonHTMLAttributes, ReactNode } from "react";
import { PRIMARY_BUTTON_CLASS } from "@/constants";

/** Circular spinner, sized and colored by the surrounding text. */
export function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      className={`flex-shrink-0 motion-safe:animate-spin ${className}`}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Button for any action that waits on the server (save, create, delete).
 * While `pending` it shows a spinner and `pendingLabel`, and can't be clicked
 * again. The caller sets `pending` on the click itself, before any await, and
 * keeps it on through a redirect, so the button never looks idle mid-action.
 */
export default function SubmitButton({
  pending,
  pendingLabel = "Guardando…",
  base = PRIMARY_BUTTON_CLASS,
  className = "",
  disabled,
  children,
  type = "submit",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  pending: boolean;
  pendingLabel?: string;
  /** Button style; defaults to the primary button. */
  base?: string;
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending}
      className={`${base} ${className}`}
      {...props}
    >
      {pending ? (
        <>
          <Spinner />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
