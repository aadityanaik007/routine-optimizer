import { getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";
import type { Config, Context } from "@netlify/functions";

const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024;

interface StoredAppData {
  goals: unknown[];
  categories: unknown[];
  theme: "light" | "dark";
  roadmap: unknown[];
  gymRoadmap: unknown[];
}

function response(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function isAppData(value: unknown): value is StoredAppData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredAppData>;
  return Array.isArray(candidate.goals)
    && Array.isArray(candidate.categories)
    && (candidate.theme === "light" || candidate.theme === "dark")
    && Array.isArray(candidate.roadmap)
    && Array.isArray(candidate.gymRoadmap);
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

export default async function handler(request: Request, _context: Context): Promise<Response> {
  const user = await getUser();
  if (!user) return response({ error: "Sign in to access your data." }, 401);

  const store = getStore({ name: "rings-user-data", consistency: "strong" });

  if (request.method === "GET") {
    const record = await store.getWithMetadata(user.id, { type: "json" });
    if (!record) return response({ error: "No cloud data exists yet." }, 404);
    if (!isAppData(record.data)) return response({ error: "Stored application data is invalid." }, 500);
    return response({
      data: record.data,
      revision: Number(record.metadata.revision ?? 1),
      updatedAt: String(record.metadata.updatedAt ?? ""),
    });
  }

  if (request.method === "PUT") {
    if (!isSameOrigin(request)) return response({ error: "Invalid request origin." }, 403);
    const contentLength = Number(request.headers.get("Content-Length") ?? "0");
    if (contentLength > MAX_PAYLOAD_BYTES) return response({ error: "The saved roadmap is too large." }, 413);

    let body: unknown;
    try {
      const text = await request.text();
      if (new TextEncoder().encode(text).byteLength > MAX_PAYLOAD_BYTES) return response({ error: "The saved roadmap is too large." }, 413);
      body = JSON.parse(text);
    } catch {
      return response({ error: "Request body must be valid JSON." }, 400);
    }

    const data = (body as { data?: unknown })?.data;
    if (!isAppData(data)) return response({ error: "The application data failed server validation." }, 422);
    const existing = await store.getMetadata(user.id);
    const revision = Number(existing?.metadata.revision ?? 0) + 1;
    const updatedAt = new Date().toISOString();
    await store.setJSON(user.id, data, { metadata: { revision, updatedAt } });
    return response({ saved: true, revision, updatedAt });
  }

  return response({ error: "Method not allowed." }, 405);
}

export const config: Config = {
  path: "/api/data",
};
