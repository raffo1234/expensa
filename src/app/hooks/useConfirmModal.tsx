"use client";

import { useGlobalState } from "@/lib/globalState";

interface ConfirmModalOptions {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  onConfirm: () => void | Promise<void>;
}

function ConfirmModalContent({
  title = "Are you sure?",
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onClose,
}: ConfirmModalOptions & { onClose: () => void }) {
  const handleConfirm = async () => {
    onClose();
    await onConfirm();
  };

  const confirmColors = {
    danger: "bg-rose-500 hover:bg-rose-600 text-white",
    warning: "bg-amber-500 hover:bg-amber-600 text-white",
    default: "bg-cyan-500 hover:bg-cyan-600 text-white",
  };

  const iconColors = {
    danger: "text-rose-400 bg-rose-50",
    warning: "text-amber-400 bg-amber-50",
    default: "text-cyan-400 bg-cyan-50",
  };

  const icons = {
    danger: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
        />
      </svg>
    ),
    warning: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M1 21L12 2l11 19zm11-3q.425 0 .713-.288T13 17t-.288-.712T12 16t-.712.288T11 17t.288.713T12 18m-1-3h2v-5h-2z"
        />
      </svg>
    ),
    default: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
        />
      </svg>
    ),
  };

  return (
    <div className="flex flex-col items-center text-center">
      <div className={`${iconColors[variant]} p-4 rounded-full mb-5`}>{icons[variant]}</div>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      {description && <p className="text-gray-400 mb-8 max-w-sm">{description}</p>}
      <div className="flex gap-3 mt-2">
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors duration-200"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className={`cursor-pointer px-6 py-2.5 rounded-xl font-medium transition-colors duration-200 ${confirmColors[variant]}`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

export function useConfirmModal() {
  const { setModalContent, setModalOpen } = useGlobalState();

  const confirm = (options: ConfirmModalOptions) => {
    const onClose = () => setModalOpen(false);

    setModalContent(<ConfirmModalContent {...options} onClose={onClose} />);
    setModalOpen(true);
  };

  return { confirm };
}
