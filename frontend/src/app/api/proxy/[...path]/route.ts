import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL as BACKEND } from "@/lib/config";

/**
 * Proxy all /api/proxy/* requests to the backend, injecting the NextAuth
 * session JWT as a Bearer token so the backend can verify the user identity.
 *
 * The raw session-token cookie IS the HS256 JWT that the backend verifies
 * with NEXTAUTH_SECRET — no re-encoding needed.
 */
async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
): Promise<NextResponse> {
  const cookieStore = cookies();

  // NextAuth v5 stores the JWT in different cookie names depending on the
  // deployment environment (HTTP dev vs HTTPS prod).
  const sessionToken =
    cookieStore.get("authjs.session-token")?.value ??
    cookieStore.get("__Secure-authjs.session-token")?.value;

  const backendPath = pathSegments.join("/");
  const search = request.nextUrl.search;
  const backendUrl = `${BACKEND}/api/v1/${backendPath}${search}`;

  const outgoingHeaders = new Headers();
  if (sessionToken) {
    outgoingHeaders.set("Authorization", `Bearer ${sessionToken}`);
  }

  // Forward Content-Type verbatim — critical for multipart/form-data boundaries
  const contentType = request.headers.get("Content-Type");
  if (contentType) {
    outgoingHeaders.set("Content-Type", contentType);
  }

  const hasBody = !["GET", "HEAD"].includes(request.method);

  const res = await fetch(backendUrl, {
    method: request.method,
    headers: outgoingHeaders,
    body: hasBody ? request.body : undefined,
    // @ts-expect-error -- Node.js fetch requires duplex for streaming request bodies
    duplex: hasBody ? "half" : undefined,
  });

  return new NextResponse(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/json",
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyRequest(request, params.path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyRequest(request, params.path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyRequest(request, params.path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyRequest(request, params.path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyRequest(request, params.path);
}
