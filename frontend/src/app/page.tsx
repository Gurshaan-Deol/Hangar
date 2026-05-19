"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      if (session?.syncError) {
        router.replace("/login?error=sync_failed");
      } else {
        router.replace("/wardrobe");
      }
    } else if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, session, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <LoadingSpinner size="md" />
      <p className="text-sm text-gray-400">Loading...</p>
    </div>
  );
}
