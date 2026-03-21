import { cloneElement, isValidElement } from "react";
import PopoverInnerButton from "./PopoverInnerButton";

export default function InnerCircularButton({
  title,
  isActive = false,
  isDisabled = false,
  children,
}: {
  title?: React.ReactNode;
  isActive?: boolean;
  isDisabled?: boolean;
  children?: React.ReactNode;
}) {
  const buttonClasses = `p-2 flex transition-colors duration-300 border rounded-full ${
    isDisabled
      ? "cursor-not-allowed opacity-50 pointer-events-none border-cyan-200 text-cyan-200 bg-white"
      : `cursor-pointer ${
          isActive
            ? "bg-cyan-300 border-cyan-300 hover:bg-cyan-400 text-white"
            : "text-cyan-400 border-cyan-200 bg-white hover:bg-cyan-50"
        }`
  }`;

  const isInjectableElement =
    isValidElement(children) &&
    typeof (children as React.ReactElement).type === "string" &&
    (children as React.ReactElement).type !== "svg";

  const styledChild = isInjectableElement ? (
    cloneElement(children as React.ReactElement<{ className?: string }>, {
      className:
        `${(children as React.ReactElement<{ className?: string }>).props.className ?? ""} ${buttonClasses}`.trim(),
    })
  ) : (
    <span className={buttonClasses}>{children}</span>
  );

  if (!title) return styledChild;

  return <PopoverInnerButton title={title}>{styledChild}</PopoverInnerButton>;
}
