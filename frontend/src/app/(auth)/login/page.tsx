"use client";

import { signIn } from "next-auth/react";
import { Github, Chrome } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Hangar</h1>
          <p className="mt-2 text-sm text-gray-500">Your AI-powered wardrobe</p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => signIn("github", { callbackUrl: "/wardrobe" })}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
          >
            <Github className="h-4 w-4" />
            Continue with GitHub
          </button>

          <button
            onClick={() => signIn("google", { callbackUrl: "/wardrobe" })}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
          >
            <Chrome className="h-4 w-4" />
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}
