import PopoverInnerButton from "./PopoverInnerButton";

type BaseProps = {
  title?: React.ReactNode;
  isActive?: boolean;
  isDisabled?: boolean;
  children?: React.ReactNode;
  className?: string;
};

type AsButton = BaseProps & {
  as?: "button";
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  href?: never;
  target?: never;
  rel?: never;
};

type AsAnchor = BaseProps & {
  as: "a";
  href: string;
  target?: "_blank" | "_self" | "_parent" | "_top";
  rel?: string;
  download?: string | boolean;
  onClick?: () => void;
  type?: never;
};

type CircularSecondaryButtonProps = AsButton | AsAnchor;

export default function CircularSecondaryButton({
  title,
  isActive = false,
  isDisabled = false,
  children,
  className: customClassName,
  ...props
}: CircularSecondaryButtonProps) {
  const className = `flex transition-colors duration-300 border rounded-full ${
    isDisabled
      ? "cursor-not-allowed opacity-50 pointer-events-none border-cyan-200 text-cyan-200 bg-white"
      : `cursor-pointer ${
          isActive
            ? "bg-cyan-300 border-cyan-300 hover:bg-cyan-400 text-white"
            : "text-cyan-400 border-cyan-200 bg-white hover:bg-cyan-50"
        }`
  }${customClassName ? ` ${customClassName}` : ""}`;

  const content = <PopoverInnerButton title={title}>{children}</PopoverInnerButton>;

  if (props.as === "a") {
    const { href, target, rel, onClick, download } = props;
    return (
      <a
        href={href}
        target={target}
        rel={target === "_blank" ? (rel ?? "noopener noreferrer") : rel}
        download={download}
        onClick={onClick}
        className={className}
      >
        {content}
      </a>
    );
  }

  const { onClick, type = "button" } = props;
  return (
    <button type={type} onClick={onClick} disabled={isDisabled} className={className}>
      {content}
    </button>
  );
}
