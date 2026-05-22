import type { ClothingItem } from "./clothing";

export interface WeatherData {
  temperature: number;
  feels_like: number;
  condition: "clear" | "cloudy" | "foggy" | "rain" | "snow" | "stormy" | string;
  humidity: number;
  wind_speed: number;
  is_daytime: boolean;
  location: string;
  fetched_at: string;
}

export interface Outfit {
  id: string;
  user_id: string;
  name: string | null;
  occasion: string | null;
  weather_temp_min: number | null;
  weather_temp_max: number | null;
  ai_reasoning: string | null;
  style_tip: string | null;
  locked_item_ids: string[];
  user_instruction: string | null;
  rating: number | null;
  is_favourite: boolean;
  wear_count: number;
  items: ClothingItem[];
  created_at: string;
  worn_at: string | null;
}

export interface RecommendationResponse {
  weather: WeatherData;
  outfit: Outfit;
  generated_at: string;
}

export interface OutfitListResponse {
  outfits: Outfit[];
  total: number;
  page: number;
  limit: number;
}

export type Occasion =
  | "casual"
  | "work"
  | "formal"
  | "outdoor"
  | "date"
  | "party"
  | "travel"
  | "gym"
  | "brunch";
