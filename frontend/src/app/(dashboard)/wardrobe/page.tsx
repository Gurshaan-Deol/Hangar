import { Navbar } from "@/components/layout/Navbar";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

export default function WardrobePage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <h1 className="text-2xl font-bold text-white">My Wardrobe</h1>
          <p className="mt-2 text-gray-400">Coming soon</p>
        </main>
      </div>
    </ProtectedRoute>
  );
}
