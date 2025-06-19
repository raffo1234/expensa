"use client";

import { useGlobalState } from "@/lib/globalState";
import ShareReport from "./ShareReport";

export default function ShareReportButton({
  id,
  userId,
}: {
  id: string;
  userId: string;
}) {
  const { setModalContent, setModalOpen } = useGlobalState();

  const handleOnClick = () => {
    setModalContent(<ShareReport dicomId={id} userId={userId} />);
    setModalOpen(true);
  };

  return (
    <button
      onClick={handleOnClick}
      title="Share Report"
      className="hover:border-cyan-200 hover:text-cyan-400 transition-colors duration-300 hover:bg-cyan-50 p-1.5 rounded-lg bg-gray-100 cursor-pointer border border-gray-200"
    >
      {
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
        >
          <g
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.5"
          >
            <path d="M22 13.998c-.029 3.414-.218 5.296-1.46 6.537C19.076 22 16.718 22 12.003 22s-7.073 0-8.538-1.465S2 16.713 2 11.997C2 7.282 2 4.924 3.465 3.46C4.706 2.218 6.588 2.029 10.002 2" />
            <path
              strokeLinejoin="round"
              d="M22 7h-8c-1.818 0-2.913.892-3.32 1.3q-.187.19-.19.19q0 .003-.19.19C9.892 9.087 9 10.182 9 12v3m13-8l-5-5m5 5l-5 5"
            />
          </g>
        </svg>
      }
    </button>
  );
}
