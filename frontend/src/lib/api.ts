import axios, { type AxiosError } from "axios";
import { signOut } from "next-auth/react";
import type { ClothingItem, ClothingItemListResponse, ClothingItemStatus } from "@/types/clothing";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
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

    const message =
      error.response?.data?.detail ?? "An unexpected error occurred. Please try again.";

    return Promise.reject(new ApiError(httpStatus ?? 500, message));
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

export async function getRecommendations(): Promise<unknown> {
  const { data } = await apiClient.get("/recommendations");
  return data;
}

export default apiClient;
