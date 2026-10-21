import { Children, cloneElement, isValidElement, useId, type ReactNode } from "react";

// Custom form controls opt in to receiving the field's id by setting this flag.
type FieldControl = { acceptsFieldId?: boolean };

const NATIVE_CONTROLS = new Set(["input", "select", "textarea"]);

/**
 * Gives the first form control inside `children` the label's id, so the label
 * is announced by screen readers and clicking it focuses the control. Wrappers
 * such as a flex row with a settings button are searched; only one control is
 * labelled.
 */
function labelFirstControl(children: ReactNode, id: string, describedBy?: string): ReactNode {
  let done = false;
  const visit = (node: ReactNode): ReactNode =>
    Children.map(node, (child) => {
      if (done || !isValidElement<{ id?: string; children?: ReactNode }>(child)) return child;
      const isControl =
        (typeof child.type === "string" && NATIVE_CONTROLS.has(child.type)) ||
        (typeof child.type === "function" && (child.type as FieldControl).acceptsFieldId);
      if (isControl) {
        done = true;
        return cloneElement(child as React.ReactElement<Record<string, unknown>>, {
          id: child.props.id ?? id,
          ...(describedBy ? { "aria-describedby": describedBy } : {}),
        });
      }
      if (typeof child.type === "string" && child.props.children) {
        return cloneElement(child, undefined, visit(child.props.children));
      }
      return child;
    });
  return visit(children);
}

export default function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  const autoId = useId();
  const id = htmlFor ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} className="text-sm font-semibold text-slate-800">
        {label}
      </label>
      {htmlFor ? children : labelFirstControl(children, id, hintId)}
      {hint && (
        <p id={hintId} className="m-0 text-xs text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}
