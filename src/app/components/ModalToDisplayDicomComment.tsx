import { useGlobalState } from "@/lib/globalState";
import { ICON_SIZE } from "@/constants";
import InnerCircularButton from "./InnerCircularButton";

export default function ModalToDisplayDicomComment({
  comment,
}: {
  comment: string | null | undefined;
}) {
  const { setModalContent, setModalOpen } = useGlobalState();
  const title = "Comment";

  const onClick = () => {
    setModalContent(
      <>
        <h1 className="font-semibold text-xl mb-3">Study Comment</h1>
        <div className="p-5 rounded-xl border border-slate-200 bg-white whitespace-pre-wrap">
          {comment}
        </div>
      </>,
    );
    setModalOpen(true);
  };

  if (comment === null || comment?.trim() === "") return null;

  return (
    <button onClick={onClick} type="button" title={title}>
      <InnerCircularButton title={title} isActive={true}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={ICON_SIZE}
          height={ICON_SIZE}
          viewBox="0 0 24 24"
        >
          <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5">
            <path strokeLinejoin="round" d="M8 13.5h8m-8-5h4" />
            <path d="M6.099 19q-1.949-.192-2.927-1.172C2 16.657 2 14.771 2 11v-.5c0-3.771 0-5.657 1.172-6.828S6.229 2.5 10 2.5h4c3.771 0 5.657 0 6.828 1.172S22 6.729 22 10.5v.5c0 3.771 0 5.657-1.172 6.828S17.771 19 14 19c-.56.012-1.007.055-1.445.155c-1.199.276-2.309.89-3.405 1.424c-1.563.762-2.344 1.143-2.834.786c-.938-.698-.021-2.863.184-3.865" />
          </g>
        </svg>
      </InnerCircularButton>
    </button>
  );
}
