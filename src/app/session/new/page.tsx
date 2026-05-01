import { signIn } from "@/lib/auth";
import LogoLink from "@/components/LogoLink";
import { ICON_SIZE } from "@/constants";
import Image from "next/image";

export default function Page() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="flex flex-col flex-1 items-center justify-center px-8 bg-white relative">
        <div className="absolute top-8 left-8">
          <LogoLink />
        </div>
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">Welcome back</h1>
          <p className="text-sm text-gray-400 mb-8  text-center">Sign in to continue to Finolis</p>

          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
          >
            <button
              type="submit"
              className="flex justify-center items-center gap-3 w-full cursor-pointer font-medium text-sm px-4 py-3.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 text-gray-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={ICON_SIZE}
                height={ICON_SIZE}
                viewBox="0 0 48 48"
              >
                <path
                  fill="#fbc02d"
                  d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                />
                <path
                  fill="#e53935"
                  d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                />
                <path
                  fill="#4caf50"
                  d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                />
                <path
                  fill="#1565c0"
                  d="M43.611,20.083L43.595,20L42,20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                />
              </svg>
              Continue with Google
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-8">
            By signing in, you agree to our{" "}
            <a href="/terms" className="underline hover:text-gray-600">
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className="underline hover:text-gray-600">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>

      {/* Right panel — full height image */}
      <div className="hidden md:block relative w-[35%] overflow-hidden">
        <Image
          src="/expensa-hero.png"
          alt="Finolis app preview"
          fill
          className="object-cover object-right opacity-80"
          priority
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Bottom quote */}
        <div className="absolute bottom-10 left-10 right-10">
          <p className="text-white text-lg font-medium leading-snug mb-2">
            "One app. All your accounts.
            <br />
            Total clarity over every dollar."
          </p>
          <p className="text-white/50 text-sm">Finolis — Personal finance, simplified</p>
        </div>
      </div>
    </div>
  );
}
