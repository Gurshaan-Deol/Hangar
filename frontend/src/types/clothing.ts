export interface ClothingItem {
  id: string;
  user_id: string;
  name: string | null;
  category: string | null;
  color: string | null;
  style: string | null;
  season: string[] | null;
  tags: string[] | null;
  image_url: string | null;
  status: "pending" | "analyzing" | "ready" | "failed";
  notes: string | null;
  created_at: string;
}

export interface ClothingItemStatus {
  id: string;
  status: ClothingItem["status"];
  name: string | null;
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
}
