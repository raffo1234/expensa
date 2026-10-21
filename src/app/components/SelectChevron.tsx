/**
 * Dropdown arrow for custom selects (buttons that open a list). Same icon,
 * size, stroke and color as the native `.select-field` arrow in globals.css,
 * so custom and native selects look identical.
 */
export default function SelectChevron({ open = false }: { open?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={`flex-shrink-0 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
