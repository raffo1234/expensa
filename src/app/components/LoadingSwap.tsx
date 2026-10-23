import type { ReactNode } from "react";

/** Three dots that rise and fall in turn (animate-dot-bounce in globals.css). */
export function LoadingDots() {
  return (
    <span aria-hidden className="flex items-center gap-[3px]">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          style={{ animationDelay: `${delay}ms` }}
          className="size-1 rounded-full bg-violet-500 motion-safe:animate-dot-bounce"
        />
      ))}
    </span>
  );
}

/**
 * Shows `children`, or the loading dots in its place while `busy`.
 * Asymmetric on purpose: the dots fade in only after 150ms (quick loads never
 * flash them), but leave instantly the moment the data is there, so they
 * never linger after the content has updated.
 */
export default function LoadingSwap({ busy, children }: { busy: boolean; children: ReactNode }) {
  // Only the way in is animated; with no transition class, the way out is instant.
  const enter = "transition-opacity duration-200 delay-150";
  return (
    <span className="relative inline-flex items-center justify-center">
      <span className={`inline-flex ${busy ? `opacity-0 ${enter}` : "opacity-100"}`}>
        {children}
      </span>
      <span
        className={`absolute inset-0 flex items-center justify-center ${
          busy ? `opacity-100 ${enter}` : "opacity-0"
        }`}
      >
        <LoadingDots />
      </span>
    </span>
  );
}
