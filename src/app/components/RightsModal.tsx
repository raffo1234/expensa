"use client";

import { useGlobalState } from "@/lib/globalState";
import { useTranslations } from "next-intl";

type RightsModalProps = {
  isRightsChecked: boolean;
  setIsRightsChecked: (checked: boolean) => void;
};

export default function RightsModal({ isRightsChecked, setIsRightsChecked }: RightsModalProps) {
  const { setModalContent, setModalOpen } = useGlobalState();
  const t = useTranslations("Rights");

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsRightsChecked(event.target.checked);
  };

  const onClick = () => {
    setModalContent(
      <div className="leading-relaxed text-base text-slate-900">
        <h1 className="text-center mb-6 font-semibold text-lg">{t("title")}</h1>
        {t("introduccion")}
        <br />
        <br />
        {t("FINALIDAD")}
        <br />
        <br />
        {t("TRANSFERENCIAS Y DESTINATARIOS")}
        <br />
        <br />
        {t("EJERCICIO DE LOS DERECHOS ARCO")}
        <br />
        <br />
        {t("revocacion_uso")}
        <br />
        <br />
        {t("ejercicio_de_derechos")}
        <br />
        <br />
        {t("reclamo_autoridad")}
        <br />
        <br />
        {t("responsabilidad_cadia")}
        <br />
        <br />
        {t("declaracion_informado")}
      </div>,
    );
    setModalOpen(true);
  };

  return (
    <div className="flex items-center justify-center mt-4">
      <div className="ml-1 relative w-9 h-9">
        <input
          id="rights"
          type="checkbox"
          name="rights"
          className="hidden peer"
          checked={isRightsChecked}
          onChange={handleCheckboxChange}
        />
        <label
          htmlFor="rights"
          className="cursor-pointer block w-full h-full absolute top-1/2 -translate-x-1/2 -translate-y-1/2 left-1/2 rounded-lg text-gray-400"
        ></label>
        <div className="bg-white cursor-pointer block w-5 h-5 border-2 pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 left-1/2 peer-checked:border-cyan-400 rounded-sm text-gray-400 peer-checked:text-cyan-400"></div>
        <svg
          className="hidden peer-checked:text-cyan-400 pointer-events-none peer-checked:block absolute top-1/2 -translate-x-1/2 -translate-y-1/2 left-1/2"
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
        >
          <g fill="none" fillRule="evenodd">
            <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z" />
            <path
              fill="currentColor"
              d="M21.546 5.111a1.5 1.5 0 0 1 0 2.121L10.303 18.475a1.6 1.6 0 0 1-2.263 0L2.454 12.89a1.5 1.5 0 1 1 2.121-2.121l4.596 4.596L19.424 5.111a1.5 1.5 0 0 1 2.122 0"
            />
          </g>
        </svg>
      </div>
      <div>
        <span>{t("label")}</span>{" "}
        <button onClick={onClick} type="button">
          <span className="underline inline-block underline-offset-3 cursor-pointer hover:text-cyan-500 transition-colors duration-400">
            {t("link")}
          </span>
        </button>
      </div>
    </div>
  );
}
