import { forwardRef } from "react";
import Link from "next/link";
import PopoverInnerButton from "./PopoverInnerButton";

// --- Types ---

type BaseProps = {
  title?: React.ReactNode;
  isActive?: boolean;
  isDisabled?: boolean;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

type WithHref = BaseProps & {
  href: string;
  target?: "_blank" | "_self" | "_parent" | "_top";
  rel?: string;
  download?: string | boolean;
  type?: never;
};

type WithoutHref = BaseProps & {
  href?: never;
  type?: "button" | "submit" | "reset";
  target?: never;
  rel?: never;
  download?: never;
};

type CircularSecondaryButtonProps = WithHref | WithoutHref;

// --- Helpers ---

const BASE = "inline-flex active:scale-95 transition-colors duration-300 border rounded-full";

const DISABLED =
  "cursor-not-allowed opacity-50 pointer-events-none border-cyan-200 text-cyan-200 bg-white";
const ACTIVE =
  "cursor-pointer bg-cyan-300 border-cyan-300 hover:border-cyan-400 hover:bg-cyan-400 text-white";
const DEFAULT = "cursor-pointer text-cyan-400 border-cyan-200 bg-white hover:bg-cyan-50";

function buildClassName(isDisabled: boolean, isActive: boolean, custom?: string): string {
  const state = isDisabled ? DISABLED : isActive ? ACTIVE : DEFAULT;
  return [BASE, state, custom].filter(Boolean).join(" ");
}

// --- Component ---

const CircularSecondaryButton = forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  CircularSecondaryButtonProps
>(function CircularSecondaryButton(
  {
    title,
    isActive = false,
    isDisabled = false,
    children,
    className,
    onClick,
    onMouseEnter,
    onMouseLeave,
    ...props
  },
  ref,
) {
  const resolvedClassName = buildClassName(isDisabled, isActive, className);
  const content = <PopoverInnerButton title={title}>{children}</PopoverInnerButton>;

  if (props.href) {
    const { href, target, rel, download } = props;
    const isExternal = href.startsWith("http") || href.startsWith("//");
    const isDownload = !!download;

    if (isExternal || isDownload) {
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          target={target}
          rel={target === "_blank" ? (rel ?? "noopener noreferrer") : rel}
          download={download}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          className={resolvedClassName}
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        target={target}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={resolvedClassName}
      >
        {content}
      </Link>
    );
  }

  const { type = "button" } = props;
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={isDisabled}
      className={resolvedClassName}
    >
      {content}
    </button>
  );
});

CircularSecondaryButton.displayName = "CircularSecondaryButton";
export default CircularSecondaryButton;
