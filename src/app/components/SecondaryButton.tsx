import { Icon } from "@iconify/react";
import { ICON_SIZE } from "@/constants";
import { BaseButton, BaseButtonProps } from "./BaseButton";

const secondaryClassName =
  "flex items-center justify-center cursor-pointer active:scale-95 gap-2 px-6 py-2 bg-white border border-gray-200 rounded-full text-gray-700 hover:bg-gray-50 transition-colors duration-200";

type SecondaryButtonProps = Omit<BaseButtonProps, "children" | "className"> & {
  icon?: string;
  type?: "button" | "submit" | "reset";
};

export default function SecondaryButton({ icon, ...props }: SecondaryButtonProps) {
  return (
    <BaseButton className={secondaryClassName} {...(props as BaseButtonProps)}>
      {icon && (
        <Icon icon={icon} fontSize={ICON_SIZE} className="text-gray-400" aria-hidden="true" />
      )}
      {props.label}
    </BaseButton>
  );
}
