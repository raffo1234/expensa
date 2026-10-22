"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Spinner } from "./SubmitButton";

/**
 * Submit button for forms that post to a server action. Reads the form's own
 * pending state, so it reacts on the click itself with no extra wiring.
 */
export default function FormPendingButton({
  className,
  pendingLabel,
  children,
}: {
  className: string;
  pendingLabel: string;
  children: ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className} disabled:cursor-wait disabled:opacity-80`}
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
