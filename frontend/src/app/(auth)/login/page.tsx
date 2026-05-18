"use client";

import { signIn } from "next-auth/react";
import { Github, Globe, Lock, Shirt } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4">
      {/* Radial gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,_#1e1b4b_0%,_#000_100%)]" />

      {/* Floating particles — pure CSS, no JS */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <span
          className="absolute h-2 w-2 rounded-full bg-indigo-400/20 animate-float-slow"
          style={{ top: "14%", left: "9%" }}
        />
        <span
          className="absolute h-3 w-3 rounded-full bg-purple-400/15 animate-float-medium"
          style={{ top: "68%", left: "82%", animationDelay: "2.1s" }}
        />
        <span
          className="absolute h-1.5 w-1.5 rounded-full bg-indigo-300/25 animate-float-fast"
          style={{ top: "38%", left: "87%", animationDelay: "0.9s" }}
        />
        <span
          className="absolute h-2.5 w-2.5 rounded-full bg-purple-500/15 animate-float-slow"
          style={{ top: "79%", left: "13%", animationDelay: "3.4s" }}
        />
        <span
          className="absolute h-2 w-2 rounded-full bg-indigo-400/20 animate-float-medium"
          style={{ top: "23%", left: "74%", animationDelay: "1.6s" }}
        />
        <span
          className="absolute h-1.5 w-1.5 rounded-full bg-purple-300/20 animate-float-fast"
          style={{ top: "57%", left: "32%", animationDelay: "0.4s" }}
        />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-[420px] rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-12 shadow-2xl shadow-black/60">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/20">
            <Shirt className="h-9 w-9 text-indigo-400" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white">Hangar</h1>
            <p className="mt-2 text-sm text-gray-400">Your AI-powered wardrobe</p>
          </div>
        </div>

        {/* Divider */}
        <div className="mb-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--color-border)]" />
          <span className="text-xs text-gray-500">Continue with</span>
          <div className="h-px flex-1 bg-[var(--color-border)]" />
        </div>

        {/* Auth buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => signIn("github", { callbackUrl: "/wardrobe" })}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm font-medium text-white transition-all duration-200 hover:border-white/20 hover:bg-[var(--color-surface-overlay)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Github className="h-4 w-4" />
            Continue with GitHub
          </button>

          <button
            onClick={() => signIn("google", { callbackUrl: "/wardrobe" })}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm font-medium text-white transition-all duration-200 hover:border-white/20 hover:bg-[var(--color-surface-overlay)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Globe className="h-4 w-4" />
            Continue with Google
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-1.5">
          <Lock className="h-3 w-3 text-gray-600" />
          <span className="text-xs text-gray-600">Your data stays on your server</span>
        </div>
      </div>
    </div>
  );
}
