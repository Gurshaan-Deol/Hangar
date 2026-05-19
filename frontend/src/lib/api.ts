import axios, { type AxiosError } from "axios";
import { signOut } from "next-auth/react";
import type { ClothingItem, ClothingItemListResponse, ClothingItemStatus, User } from "@/types/clothing";
import type {
  WeatherData,
  RecommendationResponse,
  OutfitListResponse,
  Occasion,
} from "@/types/recommendations";

export class ApiError extends Error {
  public detail?: string | Record<string, unknown>;

  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class NotEnoughItemsError extends Error {
  constructor(
    public readonly currentCount: number,
    public readonly itemsNeeded: number,
  ) {
    super("not_enough_items");
    this.name = "NotEnoughItemsError";
  }
}

// All requests go through /api/proxy, which injects the NextAuth session JWT
// before forwarding to the backend.
const apiClient = axios.create({
  baseURL: "/api/proxy",
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ detail?: string }>) => {
    const httpStatus = error.response?.status;

    if (httpStatus === 401) {
      await signOut({ callbackUrl: "/login" });
      return Promise.reject(new ApiError(401, "Session expired. Please sign in again."));
    }

    const rawDetail: unknown = error.response?.data?.detail;
    let message: string;
    if (typeof rawDetail === "string") {
      message = rawDetail;
    } else if (typeof rawDetail === "object" && rawDetail !== null) {
      const d = rawDetail as Record<string, unknown>;
      if (typeof d.message === "string") {
        message = d.message;
      } else if (typeof d.msg === "string") {
        message = d.msg;
      } else {
        message = "An unexpected error occurred. Please try again.";
      }
    } else {
      message = "An unexpected error occurred. Please try again.";
    }

    const apiErr = new ApiError(httpStatus ?? 500, message);
    apiErr.detail = rawDetail as string | Record<string, unknown> | undefined;
    return Promise.reject(apiErr);
  },
);

export async function getWardrobe(
  page = 1,
  limit = 20,
  category?: string,
): Promise<ClothingItemListResponse> {
  const params: Record<string, string | number> = { page, limit };
  if (category) params.category = category;
  const { data } = await apiClient.get<ClothingItemListResponse>("/clothing", { params });
  return data;
}

export async function uploadClothingItem(file: File): Promise<ClothingItem> {
  const formData = new FormData();
  // Backend FastAPI endpoint expects the field named "image"
  formData.append("image", file);
  const { data } = await apiClient.post<ClothingItem>("/clothing/upload", formData);
  return data;
}

export async function getClothingItem(id: string): Promise<ClothingItem> {
  const { data } = await apiClient.get<ClothingItem>(`/clothing/${id}`);
  return data;
}

export async function getClothingItemStatus(id: string): Promise<ClothingItemStatus> {
  const { data } = await apiClient.get<ClothingItemStatus>(`/clothing/${id}/status`);
  return data;
}

export async function deleteClothingItem(id: string): Promise<void> {
  await apiClient.delete(`/clothing/${id}`);
}

export async function retryAnalysis(id: string): Promise<ClothingItem> {
  const { data } = await apiClient.post<ClothingItem>(`/clothing/${id}/retry`);
  return data;
}

export async function dismissDuplicate(id: string): Promise<ClothingItem> {
  const { data } = await apiClient.post<ClothingItem>(`/clothing/${id}/dismiss-duplicate`);
  return data;
}

export async function updateClothingItem(
  itemId: string,
  updates: Partial<Pick<ClothingItem, "name" | "category" | "color" | "style" | "season" | "tags">>,
): Promise<ClothingItem> {
  const { data } = await apiClient.patch<ClothingItem>(`/clothing/${itemId}`, updates);
  return data;
}

export async function updateClothingDetails(
  itemId: string,
  data: Partial<Pick<ClothingItem, "name" | "category" | "color" | "style" | "season" | "tags" | "notes">>,
): Promise<ClothingItem> {
  const { data: updated } = await apiClient.patch<ClothingItem>(`/clothing/${itemId}/details`, data);
  return updated;
}

export async function getWeather(): Promise<WeatherData> {
  const { data } = await apiClient.get<WeatherData>("/recommendations/weather");
  return data;
}

export async function getRecommendations(
  occasion: Occasion | null,
  customRequest?: string,
): Promise<RecommendationResponse> {
  const body: { occasion?: Occasion; custom_request?: string } = {};
  if (occasion) body.occasion = occasion;
  if (customRequest) body.custom_request = customRequest;
  try {
    const { data } = await apiClient.post<RecommendationResponse>("/recommendations", body);
    return data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 400) {
      const d = typeof err.detail === "object" && err.detail !== null
        ? err.detail as Record<string, unknown>
        : null;
      if (d?.code === "not_enough_items") {
        throw new NotEnoughItemsError(
          typeof d.current_count === "number" ? d.current_count : 0,
          typeof d.items_needed === "number" ? d.items_needed : 3,
        );
      }
    }
    throw err;
  }
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>("/auth/me");
  return data;
}

export async function updateUserLocation(
  weather_lat: number,
  weather_lon: number,
): Promise<User> {
  const { data } = await apiClient.patch<User>("/auth/location", { weather_lat, weather_lon });
  return data;
}

export async function getRecommendationHistory(
  page = 1,
  limit = 10,
): Promise<OutfitListResponse> {
  const { data } = await apiClient.get<OutfitListResponse>("/recommendations/history", {
    params: { page, limit },
  });
  return data;
}

export async function getOutfitHistory(
  page = 1,
  limit = 20,
): Promise<OutfitListResponse> {
  const { data } = await apiClient.get<OutfitListResponse>("/recommendations/history", {
    params: { page, limit },
  });
  return data;
}

export async function updateOutfit(
  id: string,
  data: { rating?: number; is_favourite?: boolean },
): Promise<import("@/types/recommendations").Outfit> {
  const { data: updated } = await apiClient.patch<import("@/types/recommendations").Outfit>(
    `/recommendations/${id}`,
    data,
  );
  return updated;
}

export async function markOutfitWorn(
  id: string,
): Promise<import("@/types/recommendations").Outfit> {
  const { data } = await apiClient.post<import("@/types/recommendations").Outfit>(
    `/recommendations/${id}/wear`,
  );
  return data;
}

export async function deleteOutfit(id: string): Promise<void> {
  await apiClient.delete(`/recommendations/${id}`);
}

export default apiClient;
