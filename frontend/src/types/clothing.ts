export interface ClothingItem {
  id: string;
  user_id: string;
  name: string | null;
  category: string | null;
  color: string | null;
  style: string | null;
  season: string[] | null;
  tags: string[] | null;
  image_endpoint: string;
  status: "pending" | "analyzing" | "ready" | "failed";
  attempt_count: number;
  notes: string | null;
  duplicate_of: string | null;
  duplicate_confidence: number | null;
  duplicate_reason: string | null;
  dismissed_duplicate: boolean;
  created_at: string;
}

export interface ClothingItemStatus {
  id: string;
  status: ClothingItem["status"];
  name: string | null;
  attempt_count: number;
}

export interface ClothingItemListResponse {
  items: ClothingItem[];
  total: number;
  page: number;
  limit: number;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  weather_lat: number | null;
  weather_lon: number | null;
}
