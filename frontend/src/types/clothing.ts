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
  status: "pending" | "ready" | "error";
  notes: string | null;
  created_at: string;
}

export interface ClothingItemListResponse {
  items: ClothingItem[];
  total: number;
  page: number;
  limit: number;
}
