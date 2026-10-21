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
 * Shows `children` (an icon), or the loading dots in its place while `busy`.
 * The two cross-fade in the same box, so nothing moves, and the dots only
 * appear after 150ms so quick loads don't flicker.
 */
export default function LoadingSwap({ busy, children }: { busy: boolean; children: ReactNode }) {
  const fade = "transition-opacity duration-200";
  return (
    <span className="relative inline-flex items-center justify-center">
      <span className={`inline-flex ${fade} ${busy ? "opacity-0 delay-150" : "opacity-100"}`}>
        {children}
      </span>
      <span
        className={`absolute inset-0 flex items-center justify-center ${fade} ${
          busy ? "opacity-100 delay-150" : "opacity-0"
        }`}
      >
        <LoadingDots />
      </span>
    </span>
  );
}
