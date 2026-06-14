import { Router } from "express";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const router = Router();

const google = createGoogleGenerativeAI({
  apiKey: (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "dummy_key").trim(),
});

function fallback(query: string) {
  return "Basic advice: Stay hydrated, rest well, and consult a doctor.\n\n*(Fallback due to AI limit)*";
}

router.post("/ai", async (req, res, next) => {
  try {
    const { query } = req.body;

    if (!query) {
      res.status(400).json({ error: "Query required" });
      return;
    }

    try {
      const { text } = await generateText({
        model: google("gemini-2.5-flash"),
        system: `You are Aurora, a medical assistant.
- Keep answers medium/shortly
- Suggest general medicine only
- Always advise doctor consultation`,
        prompt: query,
      });

      res.json({ result: text });
    } catch (err: any) {
      console.error("AI Error:", err?.message);
      res.json({ result: fallback(query) });
    }
  } catch (error) {
    console.error("Server error in /ai route:", error);
    res.status(500).json({ result: "Server error" });
  }
});

export default router;
