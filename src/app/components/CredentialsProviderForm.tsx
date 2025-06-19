"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";

export default function CredentialsProviderForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(result.error);
    } else {
      router.push("/admin/dicoms");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3.5">
      {error && <p className="text-cyan-400 text-small">Try again!</p>}
      <div className="flex flex-col gap-2.5">
        <label htmlFor="email">Email:</label>
        <input
          className="bg-white w-full rounded-lg border border-gray-200 outline-0 px-5 py-2 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2.5">
        <label htmlFor="password">Password:</label>
        <input
          className="bg-white w-full rounded-lg border border-gray-200 outline-0 px-5 py-2 focus:outline-none focus:ring-4 focus:ring-cyan-100  focus:border-cyan-500"
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button
        type="submit"
        className="w-full mt-3 py-4 cursor-pointer bg-black text-white rounded-full font-semibold"
      >
        Continue
      </button>
    </form>
  );
}
