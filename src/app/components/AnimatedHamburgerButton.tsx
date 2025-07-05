export default function AnimatedHamburgerButton({
  isOpen,
  toggleMenu,
}: {
  isOpen: boolean;
  toggleMenu: () => void;
}) {
  return (
    <button
      onClick={toggleMenu}
      className="lg:invisible z-50 visible absolute right-4 top-5 h-10 w-10 flex flex-col justify-center items-center focus:outline-none group"
      aria-label={isOpen ? "Close" : "Open"}
    >
      <div
        className={`
          h-0.5 w-6 bg-gray-800 rounded-full
          transform transition-all duration-300 ease-in-out origin-center
          ${isOpen ? "translate-y-0.5 rotate-45" : "-translate-y-1.5"}
        `}
      ></div>
      <div
        className={`
          h-0.5 w-6 bg-gray-800 rounded-full
          transform transition-all duration-300 ease-in-out origin-center
          ${isOpen ? "opacity-0 scale-x-0" : "opacity-100 scale-x-100"}
        `}
      ></div>
      <div
        className={`
          h-0.5 w-6 bg-gray-800 rounded-full
          transform transition-all duration-300 ease-in-out origin-center
          ${isOpen ? "-translate-y-0.5 -rotate-45" : "translate-y-1.5"}
        `}
      ></div>
    </button>
  );
}
