import axios from "axios";
import { getSession } from "next-auth/react";

const apiClient = axios.create({
  baseURL: "/api/v1",
});

apiClient.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session) {
    // NextAuth v5 exposes the raw JWT via the session token cookie;
    // we attach it here so the backend can verify the user identity.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- session type doesn't expose accessToken by default
    const token = (session as any).accessToken ?? "";
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export async function getWardrobe() {
  // TODO: implement — GET /clothing?page=1&limit=20
  throw new Error("Not implemented");
}

export async function uploadClothingItem(_formData: FormData) {
  // TODO: implement — POST /clothing (multipart/form-data)
  throw new Error("Not implemented");
}

export async function getRecommendations() {
  // TODO: implement — GET /recommendations
  throw new Error("Not implemented");
}

export default apiClient;
