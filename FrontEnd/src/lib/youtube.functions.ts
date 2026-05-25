import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  url: z.string().min(5).max(500),
  lang: z.string().min(2).max(10).optional().default("en"),
});

function extractVideoId(url: string): string | null {
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const v = u.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => p === "embed" || p === "shorts" || p === "live" || p === "v");
      if (idx >= 0 && parts[idx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[idx + 1])) return parts[idx + 1];
    }
  } catch {
    return null;
  }
  return null;
}

function extractTranscriptText(value: unknown): string {
  const parts: string[] = [];
  const visit = (v: unknown) => {
    if (!v) return;
    if (typeof v === "string") return;
    if (Array.isArray(v)) { v.forEach(visit); return; }
    if (typeof v === "object") {
      const obj = v as Record<string, unknown>;
      for (const k of ["text", "snippet", "subtitle", "transcriptText", "content"]) {
        if (typeof obj[k] === "string" && (obj[k] as string).trim()) {
          parts.push((obj[k] as string).trim());
        }
      }
      for (const val of Object.values(obj)) visit(val);
    }
  };
  visit(value);
  const seen: string[] = [];
  for (const p of parts) {
    if (seen[seen.length - 1] !== p) seen.push(p);
  }
  return seen.join(" ").replace(/\s+/g, " ").trim();
}

export const fetchYouTubeTranscript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles").select("role")
      .eq("user_id", context.userId).eq("role", "teacher").maybeSingle();
    if (!roleRow) {
      return { ok: false as const, error: "Only teachers can use this feature." };
    }

    const videoId = extractVideoId(data.url);
    if (!videoId) {
      return { ok: false as const, error: "Could not find a valid YouTube video ID in that URL." };
    }

    const key = process.env.RAPIDAPI_KEY;
    if (!key) {
      return { ok: false as const, error: "Transcript service is not configured." };
    }
    const host = "youtube-transcripts.p.rapidapi.com";
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const endpoint = `https://${host}/youtube/transcript?url=${encodeURIComponent(watchUrl)}`;

    try {
      const res = await fetch(endpoint, {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": key,
          "X-RapidAPI-Host": host,
        },
      });

      const raw = await res.text();
      let json: unknown = null;
      try { json = JSON.parse(raw); } catch { /* not JSON */ }

      if (!res.ok) {
        console.error("RapidAPI transcript error", res.status, JSON.stringify(json ?? raw));
        return { ok: false as const, error: "Transcript service is temporarily unavailable. Please try again." };
      }

      const text = extractTranscriptText(json);
      if (!text || text.length < 50) {
        console.error("RapidAPI transcript empty", JSON.stringify(json).slice(0, 500));
        return { ok: false as const, error: "Transcript was empty or too short for this video." };
      }
      return { ok: true as const, videoId, transcript: text.slice(0, 120000) };
    } catch (e) {
      console.error("YouTube transcript fetch failed", e);
      return { ok: false as const, error: "Failed to fetch transcript." };
    }
  });
