import Image from "next/image";
import CTAButton from "@/components/CTAButton";
import { auth } from "@/lib/auth";

export default async function ExpenseLanding() {
   const session = await auth();

  return (
    <main className="min-h-screen">
      <section className="md:grid md:grid-cols-2 items-start px-10 gap-5 py-16">
        <div className="flex text-center flex-col justify-end-safe items-start">
          <div
            className="w-fit mx-auto justify-center items-center gap-2 text-[10px] font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-7"
            style={{ background: "#d4ecd4", color: "#3a6b45" }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "#3a6b45" }}
            />
            Personal finance, simplified
          </div>
          <h1
            className="font-black w-full leading-none tracking-tight mb-4"
            style={{ fontSize: "clamp(3rem, 7vw, 7rem)", color: "#2d2d2d" }}
          >
            Know
            <br />
            <span style={{ color: "#a8c8a8", opacity: 0.7 }}>your</span>
            <br />
            <span style={{ color: "#f2b97a" }}>money.</span>
          </h1>

          <p className="text-sm text-slate-700 w-full leading-relaxed mb-8">
            One app. All your accounts. Total clarity over every dollar — without the spreadsheet.
          </p>

          <div className="w-fit mx-auto">
            <CTAButton isLoggedIn={!!session} />
          </div>
        </div>

        <div>
          <Image
            src="/expensa-hero.png"
            alt="Person managing expenses on their phone"
            width={800}
            height={600}
            className="w-full h-auto object-contain relative z-0"
            priority
          />
        </div>
      </section>

      <div className="text-sm py-4 text-slate-700 px-10 mt-10 text-center border-t border-purple-200">
        {[
          { icon: "🔒", label: "No credit card needed" },
          { icon: "⚡", label: "Upload in 30 seconds" },
          { icon: "✦", label: "100% private" },
        ].map((item) => (
          <span
            key={item.label}
            className="flex md:inline md:px-4 md:w-full items-center gap-2 text-center justify-center"
          >
            <span>{item.icon}</span> {item.label}
          </span>
        ))}
      </div>
    </main>
  );
}
