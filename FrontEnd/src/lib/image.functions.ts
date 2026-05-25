import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  imageBase64: z.string().min(20).max(15_000_000), // raw base64, no data: prefix
  mimeType: z.enum(["image/png", "image/jpeg", "image/jpg", "image/webp"]),
  subject: z.string().min(1).max(120),
  grade: z.string().min(1).max(60),
  duration: z.number().min(5).max(240),
  difficulty: z.enum(["easy", "medium", "hard"]),
  language: z.string().min(1).max(60),
});

export const extractImageTranscript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles").select("role")
      .eq("user_id", context.userId).eq("role", "teacher").maybeSingle();
    if (!roleRow) {
      return { ok: false as const, error: "Only teachers can use this feature." };
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return { ok: false as const, error: "Image analysis service is not configured." };
    }

    const mime = data.mimeType === "image/jpg" ? "image/jpeg" : data.mimeType;

    const prompt = `You are an expert educator for AI Pathshala. Your task is to analyze the attached image (it could be a textbook page, a diagram, handwritten notes, or an infographic).

First, extract all text, concepts, and context from this image to create a detailed source transcript.

Second, using that transcript as your only background source context, generate a complete, structured Lesson Plan for:
- Subject: ${data.subject}
- Grade/Class: ${data.grade}
- Duration: ${data.duration}
- Difficulty: ${data.difficulty}
- Output Language: ${data.language}

Format the final output beautifully using markdown. Begin your response with a section titled "## Source Transcript" containing everything you extracted from the image, followed by the full lesson plan.`;

    const endpoint =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                { inlineData: { mimeType: mime, data: data.imageBase64 } },
              ],
            },
          ],
        }),
      });

      const raw = await res.text();
      let json: any = null;
      try { json = JSON.parse(raw); } catch { /* keep raw */ }

      if (!res.ok) {
        console.error("Gemini image API error", res.status, raw.slice(0, 1000));
        return {
          ok: false as const,
          error: "Image analysis is temporarily unavailable. Please try again.",
        };
      }

      const text: string =
        json?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p?.text ?? "")
          .join("\n")
          .trim() ?? "";

      if (!text || text.length < 50) {
        console.error("Gemini image API empty response", JSON.stringify(json).slice(0, 800));
        return { ok: false as const, error: "Could not extract enough content from this image." };
      }

      return { ok: true as const, transcript: text.slice(0, 120000) };
    } catch (e) {
      console.error("Gemini image fetch failed", e);
      return { ok: false as const, error: "Failed to analyze image." };
    }
  });
