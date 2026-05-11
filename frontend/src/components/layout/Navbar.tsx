"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Shirt } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="bg-gray-900 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Left: logo + nav links */}
        <div className="flex items-center gap-6">
          <Link
            href="/wardrobe"
            className="flex items-center gap-2 text-lg font-bold tracking-tight"
          >
            <Shirt className="h-5 w-5" />
            Hangar
          </Link>

          <div className="flex items-center gap-4 text-sm text-gray-400">
            <Link
              href="/wardrobe"
              className="transition-colors hover:text-white"
            >
              Wardrobe
            </Link>
            <Link
              href="/recommendations"
              className="transition-colors hover:text-white"
            >
              Recommendations
            </Link>
          </div>
        </div>

        {/* Right: avatar + name + sign out */}
        <div className="flex items-center gap-3">
          {session?.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatar URLs are external; configuring remotePatterns for every OAuth provider is out of scope
            <img
              src={session.user.image}
              alt={session.user.name ?? "User avatar"}
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-600 text-sm font-medium">
              {session?.user?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}

          {session?.user?.name && (
            <span className="text-sm text-gray-300">{session.user.name}</span>
          )}

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
