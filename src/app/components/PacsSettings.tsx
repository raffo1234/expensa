import { useGlobalState } from "@/lib/globalState";
import { Icon } from "@iconify/react/dist/iconify.js";
import PacsSettingsPageContent from "./PacsSettingsPageContent";
import { ICON_SIZE } from "@/constants";

export default function PacsSettings({
  userId,
  userRoleId,
}: {
  userId: string;
  userRoleId: string;
}) {
  const { setModalContent, setModalOpen } = useGlobalState();

  const handleOnClick = () => {
    setModalContent(
      <PacsSettingsPageContent userId={userId} userRoleId={userRoleId} />
    );
    setModalOpen(true);
  };

  return (
    <button
      title="Pacs Settings"
      onClick={handleOnClick}
      className="cursor-pointer p-3 border border-gray-200 rounded-xl w-fit hover:border-cyan-200 hover:text-cyan-400 transition-colors duration-300"
    >
      <Icon icon="solar:settings-linear" fontSize={ICON_SIZE} />
    </button>
  );
}
