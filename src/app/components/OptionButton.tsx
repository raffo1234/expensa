import React from "react";
import clsx from "clsx";

type OptionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  isActive?: boolean;
};

const OptionButton: React.FC<OptionButtonProps> = ({
  children,
  isActive = false,
  className = "",
  disabled = false,
  type = "button",
  ...rest
}) => {
  return (
    <button
      type={type}
      disabled={disabled}
      className={clsx(
        "px-5 py-2 truncate active:scale-95 rounded-lg border transition-colors duration-300 cursor-pointer",
        isActive
          ? "bg-cyan-50 border-cyan-200"
          : "hover:bg-gray-100 border-transparent hover:border-gray-300 bg-gray-100",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
};

export default OptionButton;
