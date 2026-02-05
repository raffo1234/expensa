import { getTranslations } from "next-intl/server";

export default async function Why() {
  const t = await getTranslations("WhySection");

  const items = [
    { key: "item1", iconColor: "bg-cyan-500" },
    { key: "item2", iconColor: "bg-blue-500" },
    { key: "item3", iconColor: "bg-indigo-500" },
    { key: "item4", iconColor: "bg-emerald-500" },
  ];

  return (
    <section className="max-w-7xl mx-auto px-6 py-24 border-t border-gray-100 bg-white">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
        <div className="lg:col-span-5 flex flex-col items-start space-y-8">
          <div className="inline-flex items-center gap-3">
            <span className="h-[1px] w-8 bg-cyan-600"></span>
            <span className="text-cyan-600 font-bold text-[10px] tracking-[0.4em] uppercase">
              {t("badge")}
            </span>
          </div>

          <h3 className="text-5xl md:text-6xl font-medium tracking-tight text-[#0A0A0A] leading-[1.05] [font-family:var(--font-poppins)] [text-wrap:balance]">
            {t("mainTitle")}
          </h3>

          <div className="hidden lg:flex relative w-full aspect-square max-w-[320px] items-center justify-center">
            {/* Fondo: Círculos concéntricos de precisión */}
            <div className="absolute inset-0 border border-cyan-100 rounded-full opacity-40" />
            <div className="absolute inset-8 border border-cyan-50 rounded-full opacity-60" />

            {/* El "Scanner": Una línea que barre el área (Awwward move) */}
            <div className="absolute inset-0 rounded-full border-t-2 border-cyan-500/30 animate-[spin_4s_linear_infinite] -z-10" />

            {/* Contenido Central: Un gráfico de pulso o nodos de datos */}
            <div className="relative flex flex-col items-center group">
              <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-1 bg-cyan-500/40 rounded-full animate-[pulse_2s_infinite]"
                    style={{
                      height: `${Math.random() * 40 + 20}px`,
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
              <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-cyan-600 uppercase bg-cyan-50 px-3 py-1 rounded-full">
                Analyzing DICOM...
              </span>
            </div>

            {/* Puntos de datos "Hotspots" en el radar */}
            <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-ping" />
            <div className="absolute bottom-1/3 left-1/4 w-1.5 h-1.5 bg-cyan-300 rounded-full opacity-50" />
          </div>
        </div>

        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
          {items.map((item) => (
            <div key={item.key} className="group flex flex-col space-y-5">
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${item.iconColor} shadow-sm group-hover:scale-150 transition-transform duration-500`}
                />
                <h4 className="text-xl font-bold text-gray-900 tracking-tight [text-wrap:balance]">
                  {t(`${item.key}.title`)}
                </h4>
              </div>

              <div className="pl-5 border-l border-gray-100 group-hover:border-cyan-200 transition-colors duration-500">
                <p
                  className="text-gray-500 leading-relaxed font-light text-base md:text-[1.05rem]"
                  dangerouslySetInnerHTML={{ __html: t(`${item.key}.description`) }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
