"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/layout/Navbar";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { LocationSettings } from "@/components/settings/LocationSettings";
import { getCurrentUser } from "@/lib/api";

export default function SettingsPage() {
  const { data: session } = useSession();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
    enabled: !!session,
  });

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black">
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="mt-1 text-sm text-gray-400">Manage your Hangar preferences</p>
          </div>

          <div className="flex flex-col gap-4">
            <LocationSettings user={user ?? null} />

            {/* AI Provider — read-only placeholder */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <h2 className="text-base font-semibold text-white">AI Provider</h2>
              <p className="mt-1 text-sm text-gray-400">Configure in your <code className="rounded bg-white/5 px-1 py-0.5 text-xs text-gray-300">.env</code> file via <code className="rounded bg-white/5 px-1 py-0.5 text-xs text-gray-300">AI_PROVIDER</code></p>
            </div>

            {/* Account — read-only */}
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
              <h2 className="mb-3 text-base font-semibold text-white">Account</h2>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-16 text-xs text-gray-500">Name</span>
                  <span className="text-sm text-gray-200">{session?.user?.name ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16 text-xs text-gray-500">Email</span>
                  <span className="text-sm text-gray-200">{session?.user?.email ?? "—"}</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
