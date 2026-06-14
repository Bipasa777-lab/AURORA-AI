import OpenAI from "openai";

const apiKey = (process.env.OPENAI_API_KEY || "dummy_key").trim();

export const openai = new OpenAI({
  apiKey,
});
