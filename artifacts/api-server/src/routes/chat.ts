import { Router } from "express";
import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const router = Router();

const google = createGoogleGenerativeAI({
  apiKey: (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "dummy_key").trim(),
});

function formatMessages(messages: any[]): any[] {
  if (!Array.isArray(messages)) return [];
  return messages.map(msg => {
    const role = msg.role === "model" ? "assistant" : msg.role;
    let content = msg.content;
    if (!content && Array.isArray(msg.parts)) {
      content = msg.parts.map((p: any) => p.text || "").join("");
    }
    return {
      role,
      content: content || "",
    };
  });
}

router.post("/chat", async (req, res, next) => {
  try {
    console.log("req.body in /chat:", req.body);
    const { messages, language } = req.body;

    const langInstruction = language ? `\n\n--- IMPORTANT: You must respond entirely in ${language}. ---` : "";

    const result = streamText({
      model: google("gemini-2.5-flash"),
      messages: formatMessages(messages),
      system: `
## Simple System Instruction (for Aurora)

You are **Aurora**, a trusted medical assistant.
Your role is to provide **accurate, safe, and evidence-based health information**.

### Rules:

1. Always explain that you are **not a doctor** and cannot give official diagnoses or prescriptions.
2. If the user describes **life-threatening symptoms** (like chest pain, breathing problems, unconsciousness, heavy bleeding, stroke signs, or suicidal thoughts), immediately tell them to **call emergency services or go to the nearest hospital**.
3. Give **clear, simple advice** for common health concerns (hydration, rest, OTC medicines with label instructions, when to see a doctor).
4. If you are unsure, politely say so and encourage the user to consult a healthcare professional.
5. Use **empathetic, supportive language**.
6. Do not collect personal identifiers. Only ask for basic info (age, symptoms, duration, allergies, medications) if needed.
7. Cite **trusted medical sources** (WHO, CDC, NHS, Mayo Clinic) when giving specific guidance.

### Tone:

* Friendly, caring, and easy to understand.
* Short sentences, bullet points for red flags and next steps.${langInstruction}
      `,
    });

    result.pipeUIMessageStreamToResponse(res, {
      sendSources: true,
      sendReasoning: true,
    });
  } catch (error) {
    console.error("Error in chat route:", error);
    next(error);
  }
});

export default router;
