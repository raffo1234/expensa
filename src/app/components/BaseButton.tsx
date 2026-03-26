import Link from "next/link";

type BaseButtonBaseProps = {
  label: string;
  ariaLabel?: string;
  isLoading?: boolean;
  className?: string;
  children: React.ReactNode;
};

type AsButton = BaseButtonBaseProps & {
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  href?: undefined;
  target?: undefined;
};

type AsExternalLink = BaseButtonBaseProps & {
  href: string;
  target: "_blank";
  onClick?: undefined;
};

type AsLink = BaseButtonBaseProps & {
  href: string;
  target?: undefined;
  onClick?: undefined;
};

export type BaseButtonProps = AsButton | AsExternalLink | AsLink;

export function BaseButton(props: BaseButtonProps) {
  const { label, ariaLabel, isLoading, target, href, className, children } = props;

  const a11y = {
    title: label,
    "aria-label": ariaLabel ?? label,
    "aria-busy": isLoading,
    "aria-disabled": isLoading,
  };

  const disabledClassName = isLoading ? "opacity-70 pointer-events-none" : "";
  const resolvedClassName = `${className} ${disabledClassName}`;

  if (href === undefined) {
    const { type, onClick } = props;
    return (
      <button
        onClick={onClick}
        type={type ?? "button"}
        disabled={isLoading}
        className={resolvedClassName}
        {...a11y}
      >
        {children}
      </button>
    );
  }

  if (target === "_blank") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={resolvedClassName}
        {...a11y}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={resolvedClassName} {...a11y}>
      {children}
    </Link>
  );
}
