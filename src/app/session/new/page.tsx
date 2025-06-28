import CredentialsProviderForm from "@/components/CredentialsProviderForm";
import { ICON_SIZE } from "@/constants";
import { signIn } from "@/lib/auth";

export default function Page() {
  return (
    <div className="min-h-lvh flex gap-4">
      <div className="flex flex-[60%] items-center justify-center pb-20 w-full">
        <div className="max-w-[340px] px-3 w-full mx-auto flex flex-col items-center gap-6">
          <span className="text-white p-2 rounded-xl bg-rose-400 block w-[46px] h-[46px]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="30"
              height="30"
              viewBox="0 0 24 24"
            >
              <g
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.5"
              >
                <path strokeLinejoin="round" d="m12 18l2-2.5h-4l2-2.5" />
                <path d="M7 9h10M3 13v-2c0-3.75 0-5.625.955-6.939A5 5 0 0 1 5.06 2.955C6.375 2 8.251 2 12 2s5.625 0 6.939.955a5 5 0 0 1 1.106 1.106C21 5.375 21 7.251 21 11v2c0 3.75 0 5.625-.955 6.939a5 5 0 0 1-1.106 1.106C17.625 22 15.749 22 12 22s-5.625 0-6.939-.955a5 5 0 0 1-1.106-1.106c-.531-.731-.767-1.635-.871-2.939" />
              </g>
            </svg>
          </span>
          <h1 className="font-semibold text-2xl">Welcome back</h1>
          <form
            action={async () => {
              "use server";
              await signIn("google");
            }}
            className="w-full"
          >
            <button
              type="submit"
              className="flex justify-center items-center gap-2 transition-colors duration-300 w-full cursor-pointer font-semibold px-4 py-4 rounded-full border-2 border-gray-100 hover:border-gray-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                x="0px"
                y="0px"
                width={ICON_SIZE}
                height={ICON_SIZE}
                viewBox="0 0 48 48"
              >
                <path
                  fill="#fbc02d"
                  d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12	s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20	s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                ></path>
                <path
                  fill="#e53935"
                  d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039	l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                ></path>
                <path
                  fill="#4caf50"
                  d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36	c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                ></path>
                <path
                  fill="#1565c0"
                  d="M43.611,20.083L43.595,20L42,20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571	c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                ></path>
              </svg>
              <span>Continue con Google</span>
            </button>
          </form>
          <div className="text-sm text-gray-500">or</div>
          <CredentialsProviderForm />
        </div>
      </div>
      <div className="hidden flex-[40%] lg:flex items-center">
        <video
          src="/video.mp4"
          className="w-full h-auto"
          muted
          playsInline
          loop
          autoPlay
        ></video>
      </div>
    </div>
  );
}
