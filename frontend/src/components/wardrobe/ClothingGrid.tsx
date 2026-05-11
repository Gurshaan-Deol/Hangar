import { Shirt } from "lucide-react";
import type { ClothingItem } from "@/types/clothing";
import { ClothingCard } from "./ClothingCard";

interface ClothingGridProps {
  items: ClothingItem[];
  onItemClick: (item: ClothingItem) => void;
  onItemUpdated: (item: ClothingItem) => void;
}

export function ClothingGrid({ items, onItemClick, onItemUpdated }: ClothingGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Shirt className="h-16 w-16 text-gray-600" />
        <p className="mt-4 text-lg font-medium text-gray-400">Your wardrobe is empty.</p>
        <p className="mt-1 text-sm text-gray-500">Upload your first item above.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <ClothingCard
          key={item.id}
          item={item}
          onClick={onItemClick}
          onAnalysisComplete={onItemUpdated}
        />
      ))}
    </div>
  );
}
