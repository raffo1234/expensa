import { Icon } from "@iconify/react";
import { ICON_SIZE } from "@/constants";
import { BaseButton, BaseButtonProps } from "./BaseButton";

const primaryClassName =
  "group relative px-6 py-2.5 rounded-full bg-gray-950 flex gap-2 items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 active:scale-[0.97] shadow-sm hover:shadow-md";

type PrimaryButtonProps = Omit<BaseButtonProps, "children" | "className"> & {
  icon?: string;
  type?: "button" | "submit" | "reset";
};

export default function PrimaryButton({ icon, ...props }: PrimaryButtonProps) {
  return (
    <BaseButton className={primaryClassName} {...(props as BaseButtonProps)}>
      <span
        className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 pointer-events-none"
        aria-hidden="true"
      />
      {icon && (
        <Icon
          icon={props.isLoading ? "solar:spinner-line-duotone" : icon}
          fontSize={ICON_SIZE}
          className={`text-white/80 group-hover:text-white transition-colors duration-200 relative z-10 ${props.isLoading ? "animate-spin" : ""}`}
          aria-hidden="true"
        />
      )}
      {props.isLoading && !icon && (
        <Icon
          icon="solar:spinner-line-duotone"
          fontSize={ICON_SIZE}
          className="text-white/80 animate-spin relative z-10"
          aria-hidden="true"
        />
      )}
      <span className="text-white/90 group-hover:text-white text-sm font-medium tracking-wide transition-colors duration-200 relative z-10">
        {props.label}
      </span>
    </BaseButton>
  );
}
