"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { updateUserLocation } from "@/lib/api";
import type { User } from "@/types/clothing";

interface LocationSettingsProps {
  user: User | null;
}

export function LocationSettings({ user }: LocationSettingsProps) {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.weather_lat != null) setLat(String(user.weather_lat));
    if (user?.weather_lon != null) setLon(String(user.weather_lon));
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setError("Latitude must be a number between -90 and 90.");
      return;
    }
    if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      setError("Longitude must be a number between -180 and 180.");
      return;
    }

    setSaving(true);
    try {
      await updateUserLocation(latNum, lonNum);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch {
      setError("Failed to save location. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15">
          <MapPin className="h-4.5 w-4.5 text-indigo-400" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">Weather Location</h2>
          <p className="text-sm text-gray-400">Used for daily outfit recommendations</p>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">
              Latitude
            </label>
            <input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="43.7315"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">
              Longitude
            </label>
            <input
              type="number"
              step="any"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              placeholder="-79.7624"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
            />
          </div>
        </div>

        <p className="mt-2 text-xs text-gray-600">
          Find your coordinates at{" "}
          <span className="text-gray-500">maps.google.com</span>
        </p>

        {error && (
          <p className="mt-3 text-sm text-red-400">{error}</p>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save location"}
          </button>
          {success && (
            <span className="text-sm text-green-400">Location saved</span>
          )}
        </div>
      </form>
    </div>
  );
}
