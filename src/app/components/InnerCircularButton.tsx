import PopoverInnerButton from "./PopoverInnerButton";

export default function InnerCircularButton({
  title,
  isActive = false,
  isDisabled = false,
  children = "",
}: {
  title?: React.ReactNode;
  isActive?: boolean;
  isDisabled?: boolean;
  children?: React.ReactNode;
}) {
  const button = (
    <span
      className={`p-2 flex transition-colors duration-300 border rounded-full ${
        isDisabled
          ? "cursor-not-allowed opacity-50 pointer-events-none border-cyan-200 text-cyan-200 bg-white"
          : `cursor-pointer ${
              isActive
                ? "bg-cyan-300 border-cyan-300 hover:bg-cyan-400 text-white"
                : "text-cyan-400 border-cyan-200 bg-white hover:bg-cyan-50"
            }`
      }`}
    >
      {children}
    </span>
  );

  if (!title) return button;

  return <PopoverInnerButton title={title}>{button}</PopoverInnerButton>;
}
