"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Shirt } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/wardrobe", label: "Wardrobe" },
  { href: "/recommendations", label: "Recommendations" },
];

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

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

          <div className="flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "font-medium text-white"
                      : "text-gray-400 hover:text-white",
                  )}
                >
                  {label}
                  {active && (
                    <span className="mt-0.5 block h-0.5 rounded-full bg-white" />
                  )}
                </Link>
              );
            })}
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
