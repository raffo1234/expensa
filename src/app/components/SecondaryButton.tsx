import Link from "next/link";
import { Icon } from "@iconify/react";
import { ICON_SIZE } from "@/constants";

const baseClassName =
  "flex items-center active:scale-95 gap-2 px-6 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200";

function ButtonContent({ icon, label }: { icon: string; label: string }) {
  return (
    <>
      <Icon icon={icon} fontSize={ICON_SIZE} className="text-gray-400" aria-hidden="true" />
      {label}
    </>
  );
}

type SecondaryButtonBaseProps = {
  icon: string;
  label: string;
  title?: string;
  ariaLabel?: string;
};

type AsButton = SecondaryButtonBaseProps & {
  onClick: () => void;
  href?: undefined;
  target?: undefined;
};

type AsExternalLink = SecondaryButtonBaseProps & {
  href: string;
  target: "_blank";
  onClick?: undefined;
};

type AsLink = SecondaryButtonBaseProps & {
  href: string;
  target?: undefined;
  onClick?: undefined;
};

type SecondaryButtonProps = AsButton | AsExternalLink | AsLink;

export function SecondaryButton(props: SecondaryButtonProps) {
  const { icon, label, title, ariaLabel } = props;

  const a11y = {
    title,
    "aria-label": ariaLabel ?? label,
  };

  if (props.onClick) {
    return (
      <button onClick={props.onClick} className={baseClassName} {...a11y}>
        <ButtonContent icon={icon} label={label} />
      </button>
    );
  }

  if (props.target === "_blank") {
    return (
      <a
        href={props.href}
        target="_blank"
        rel="noopener noreferrer"
        className={baseClassName}
        {...a11y}
      >
        <ButtonContent icon={icon} label={label} />
      </a>
    );
  }

  return (
    <Link href={props.href} className={baseClassName} {...a11y}>
      <ButtonContent icon={icon} label={label} />
    </Link>
  );
}
