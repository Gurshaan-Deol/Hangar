"use client";

import { signIn } from "next-auth/react";
import { Github, Globe, Shirt } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-900 p-10 shadow-2xl">
        {/* Logo + title */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <Shirt className="h-12 w-12 text-white" strokeWidth={1.5} />
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white">
              Hangar
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              Your AI-powered wardrobe
            </p>
          </div>
        </div>

        {/* Auth buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => signIn("github", { callbackUrl: "/wardrobe" })}
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            <Github className="h-4 w-4" />
            Continue with GitHub
          </button>

          <button
            onClick={() => signIn("google", { callbackUrl: "/wardrobe" })}
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            <Globe className="h-4 w-4" />
            Continue with Google
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-gray-600">
          Self-hosted • Your data stays yours
        </p>
      </div>
    </div>
  );
}
