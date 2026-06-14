import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import {
  db,
  conversations,
  messages,
  hydrationLogsTable,
  sleepLogsTable,
  habitsTable,
  habitLogsTable,
  mealLogsTable,
  healthMemoriesTable,
  notificationsTable,
  vitalsLogsTable,
} from "@workspace/db";
import {
  CreateOpenaiConversationBody,
  SendOpenaiMessageBody,
  SendOpenaiVoiceMessageBody,
} from "@workspace/api-zod";
import { requireAuth, getOrCreateUser } from "../lib/auth";
import { openai } from "../lib/openai";

const router = Router();

// Define OpenAI tools for the companion
const companionTools = [
  {
    type: "function" as const,
    function: {
      name: "logHydration",
      description: "Log water intake for the user today. Call this when the user says they drank water (e.g. 'I drank 500ml water').",
      parameters: {
        type: "object",
        properties: {
          amountMl: { type: "integer", description: "The amount of water logged in milliliters (ml)." },
          note: { type: "string", description: "An optional note about the hydration log." }
        },
        required: ["amountMl"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "logSleep",
      description: "Log sleep session for last night or a specific date. Call this when the user says they slept (e.g. 'I slept 7 hours last night').",
      parameters: {
        type: "object",
        properties: {
          durationHours: { type: "number", description: "The duration of sleep in hours." },
          sleepDate: { type: "string", description: "The date of sleep in YYYY-MM-DD format. Defaults to today's date." },
          qualityScore: { type: "integer", description: "The quality score of sleep, from 1 to 10." },
          notes: { type: "string", description: "Any notes about the sleep session." }
        },
        required: ["durationHours"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "createHabit",
      description: "Create a new daily habit for the user. Call this when the user asks to start or create a habit (e.g. 'Create a habit to meditate').",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "The name of the habit (e.g., 'Meditate', 'Read', 'Gym')." },
          description: { type: "string", description: "An optional description of the habit." },
          frequency: { type: "string", enum: ["daily", "weekly"], description: "How often the habit should be done. Defaults to daily." },
          color: { type: "string", description: "Color for the habit card (e.g., teal, violet, rose, amber)." },
          icon: { type: "string", description: "Icon name (e.g., Activity, BookOpen, Dumbbell, Smile)." }
        },
        required: ["name"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "completeHabit",
      description: "Mark an existing habit as completed or skipped for today. Call this when the user says they completed or did a habit (e.g. 'I did my morning meditation').",
      parameters: {
        type: "object",
        properties: {
          habitName: { type: "string", description: "The name of the habit to update (case-insensitive)." },
          status: { type: "string", enum: ["completed", "skipped"], description: "The completion status. Defaults to completed." },
          logDate: { type: "string", description: "The date to log the habit in YYYY-MM-DD format. Defaults to today." }
        },
        required: ["habitName"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "logVitals",
      description: "Log user vitals or symptoms (e.g. blood pressure, heart rate, temperature, weight, symptoms like headache or fatigue). Call this when the user reports symptoms or vitals measurements.",
      parameters: {
        type: "object",
        properties: {
          systolic: { type: "integer", description: "Systolic blood pressure (e.g. 120)." },
          diastolic: { type: "integer", description: "Diastolic blood pressure (e.g. 80)." },
          heartRate: { type: "integer", description: "Heart rate in beats per minute (bpm) (e.g. 72)." },
          temperature: { type: "number", description: "Body temperature in degrees Celsius or Fahrenheit (e.g. 98.6 or 37)." },
          weight: { type: "number", description: "Body weight (e.g. 70 or 150)." },
          symptoms: {
            type: "array",
            items: { type: "string" },
            description: "List of symptoms experienced by the user."
          },
          notes: { type: "string", description: "Optional notes about user condition or symptoms." }
        }
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "checkDrugSafety",
      description: "Check FDA safety alerts, warnings, and recalls for a drug. Call this when the user asks about side effects, warnings, or recalls of a specific drug.",
      parameters: {
        type: "object",
        properties: {
          drugName: { type: "string", description: "The brand or generic name of the drug." }
        },
        required: ["drugName"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "searchClinicalTrials",
      description: "Search active clinical trials and research studies for a specific medical condition. Call this when the user asks about active studies, research, or clinical trials.",
      parameters: {
        type: "object",
        properties: {
          condition: { type: "string", description: "The medical condition to search trials for (e.g. 'Type 2 Diabetes', 'Alzheimer')." }
        },
        required: ["condition"]
      }
    }
  }
];

// Execute the tool and perform the database updates
async function executeTool(name: string, args: any, userId: number): Promise<any> {
  console.log(`Executing tool ${name} for user ${userId} with args:`, args);
  try {
    switch (name) {
      case "logHydration": {
        const amountMl = Number(args.amountMl);
        await db.insert(hydrationLogsTable).values({
          userId,
          amountMl,
          note: args.note || null,
        });
        return { success: true, message: `Successfully logged ${amountMl}ml of water.` };
      }
      case "logSleep": {
        const todayStr = args.sleepDate || new Date().toISOString().split("T")[0];
        const durationHours = Number(args.durationHours);
        const now = new Date();
        const bedtime = new Date(now.getTime() - durationHours * 60 * 60 * 1000);
        const wakeTime = now;
        await db.insert(sleepLogsTable).values({
          userId,
          sleepDate: todayStr,
          bedtime,
          wakeTime,
          durationHours,
          qualityScore: args.qualityScore !== undefined ? Number(args.qualityScore) : null,
          notes: args.notes || null,
        });
        return { success: true, message: `Successfully logged sleep of ${durationHours} hours on ${todayStr}.` };
      }
      case "createHabit": {
        const [habit] = await db.insert(habitsTable).values({
          userId,
          name: args.name,
          description: args.description || null,
          icon: args.icon || "Activity",
          color: args.color || "teal",
          frequency: args.frequency || "daily",
          status: "active",
        }).returning();
        return { success: true, message: `Successfully created habit '${args.name}' with ID ${habit.id}.` };
      }
      case "completeHabit": {
        const allHabits = await db.select().from(habitsTable).where(eq(habitsTable.userId, userId));
        const targetHabit = allHabits.find(
          h => h.name.toLowerCase() === args.habitName.toLowerCase() && h.status === "active"
        );
        if (!targetHabit) {
          return { success: false, message: `No active habit found named '${args.habitName}'. Please create it first.` };
        }
        const logDate = args.logDate || new Date().toISOString().split("T")[0];
        const status = args.status || "completed";

        const existing = await db.select().from(habitLogsTable).where(
          and(
            eq(habitLogsTable.habitId, targetHabit.id),
            eq(habitLogsTable.logDate, logDate),
            eq(habitLogsTable.userId, userId)
          )
        );

        if (existing[0]) {
          await db.update(habitLogsTable).set({ status }).where(eq(habitLogsTable.id, existing[0].id));
        } else {
          await db.insert(habitLogsTable).values({
            habitId: targetHabit.id,
            userId,
            status,
            logDate,
          });

          if (status === "completed") {
            const newStreak = targetHabit.currentStreak + 1;
            await db.update(habitsTable).set({
              totalCompletions: targetHabit.totalCompletions + 1,
              currentStreak: newStreak,
              longestStreak: Math.max(targetHabit.longestStreak, newStreak),
            }).where(eq(habitsTable.id, targetHabit.id));

            if (newStreak > 0 && newStreak % 5 === 0) {
              await db.insert(notificationsTable).values({
                userId,
                type: "habits",
                message: `You've completed this habit for ${newStreak} days in a row!`,
              });
            }
          }
        }
        return { success: true, message: `Successfully marked habit '${targetHabit.name}' as ${status} on ${logDate}.` };
      }
      case "logVitals": {
        const loggedAt = new Date();
        await db.insert(vitalsLogsTable).values({
          userId,
          systolic: args.systolic !== undefined ? Number(args.systolic) : null,
          diastolic: args.diastolic !== undefined ? Number(args.diastolic) : null,
          heartRate: args.heartRate !== undefined ? Number(args.heartRate) : null,
          temperature: args.temperature !== undefined ? Number(args.temperature) : null,
          weight: args.weight !== undefined ? Number(args.weight) : null,
          symptoms: args.symptoms || [],
          notes: args.notes || null,
          loggedAt,
        });
        return { success: true, message: "Successfully logged vitals and symptoms to your health log." };
      }
      case "checkDrugSafety": {
        const drug = args.drugName;
        const labelUrl = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${encodeURIComponent(drug)}"+OR+openfda.generic_name:"${encodeURIComponent(drug)}"&limit=1`;
        const recallUrl = `https://api.fda.gov/drug/enforcement.json?search=product_description:"${encodeURIComponent(drug)}"+OR+product_description:"${encodeURIComponent(drug.toLowerCase())}"&limit=3`;
        
        let warnings = "No standard warnings found.";
        let recallsSummary = "No active recalls found.";
        
        try {
          const resLabel = await fetch(labelUrl);
          if (resLabel.ok) {
            const data = (await resLabel.json()) as any;
            const result = data?.results?.[0];
            warnings = result?.warnings?.join("\n") || result?.warnings_and_cautions?.join("\n") || warnings;
          }
        } catch(e) {}
        
        try {
          const resRecall = await fetch(recallUrl);
          if (resRecall.ok) {
            const data = (await resRecall.json()) as any;
            const recalls = data?.results || [];
            if (recalls.length > 0) {
              recallsSummary = recalls.map((r: any) => `- Recall: ${r.reason_for_recall || "N/A"} (Status: ${r.status || "N/A"})`).join("\n");
            }
          }
        } catch(e) {}
        
        return {
          success: true,
          message: `Drug Safety Info for ${drug}:\nWarnings:\n${warnings.substring(0, 400)}...\nRecalls:\n${recallsSummary}`
        };
      }
      case "searchClinicalTrials": {
        const condition = args.condition;
        const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(condition)}&pageSize=3`;
        let trialsStr = "No active clinical trials found.";
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = (await res.json()) as any;
            const studies = data?.studies || [];
            if (studies.length > 0) {
              trialsStr = studies.map((s: any) => {
                const proto = s.protocolSection;
                const title = proto?.identificationModule?.officialTitle || proto?.identificationModule?.briefTitle || "Untitled Study";
                const status = proto?.statusModule?.overallStatus || "Unknown";
                const nctId = proto?.identificationModule?.nctId || "N/A";
                return `- ${title} (NCT: ${nctId}, Status: ${status})`;
              }).join("\n");
            }
          }
        } catch(e) {}
        return {
          success: true,
          message: `Clinical Trials for ${condition}:\n${trialsStr}`
        };
      }
      default:
        return { success: false, message: `Unknown tool: ${name}` };
    }
  } catch (error: any) {
    console.error(`Error executing tool ${name}:`, error);
    return { success: false, message: `Failed to execute action: ${error.message}` };
  }
}

async function buildHealthContext(userId: number): Promise<string> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayStr = today.toISOString().split("T")[0];

    const hydrationLogs = await db.select().from(hydrationLogsTable)
      .where(eq(hydrationLogsTable.userId, userId));
    const todayWater = hydrationLogs
      .filter(l => l.loggedAt >= today && l.loggedAt < tomorrow)
      .reduce((s, l) => s + l.amountMl, 0);

    const recentSleep = await db.select().from(sleepLogsTable)
      .where(eq(sleepLogsTable.userId, userId))
      .orderBy(desc(sleepLogsTable.sleepDate)).limit(3);

    const habits = await db.select().from(habitsTable)
      .where(and(eq(habitsTable.userId, userId), eq(habitsTable.status, "active")));
    const todayHabitLogs = await db.select().from(habitLogsTable)
      .where(and(eq(habitLogsTable.userId, userId), eq(habitLogsTable.logDate, todayStr)));

    const meals = await db.select().from(mealLogsTable)
      .where(eq(mealLogsTable.userId, userId));
    const todayMeals = meals.filter(m => m.loggedAt >= today && m.loggedAt < tomorrow);

    const completedHabits = todayHabitLogs.filter(l => l.status === "completed").length;
    const lastSleep = recentSleep[0];

    // Fetch latest vitals log
    const vitals = await db.select().from(vitalsLogsTable)
      .where(eq(vitalsLogsTable.userId, userId))
      .orderBy(desc(vitalsLogsTable.loggedAt)).limit(1);
    const lastVitals = vitals[0];
    const vitalsStr = lastVitals
      ? [
          lastVitals.systolic && lastVitals.diastolic ? `BP: ${lastVitals.systolic}/${lastVitals.diastolic}` : null,
          lastVitals.heartRate ? `Heart Rate: ${lastVitals.heartRate} bpm` : null,
          lastVitals.temperature ? `Temp: ${lastVitals.temperature}°` : null,
          lastVitals.weight ? `Weight: ${lastVitals.weight}kg` : null,
          lastVitals.symptoms && lastVitals.symptoms.length > 0 ? `Symptoms: ${lastVitals.symptoms.join(", ")}` : null,
        ].filter(Boolean).join(", ")
      : "not logged";

    return `
TODAY'S HEALTH DATA (${todayStr}):
- Water intake: ${todayWater}ml
- Sleep last night: ${lastSleep ? `${lastSleep.durationHours.toFixed(1)}h (quality: ${lastSleep.qualityScore ?? "not rated"})` : "not logged"}
- Habits: ${completedHabits}/${habits.length} completed (${habits.map(h => h.name).join(", ")})
- Meals today: ${todayMeals.length} logged (${todayMeals.map(m => m.mealType + ": " + m.name).join(", ") || "none"})
- Recent sleep avg (3 days): ${recentSleep.length > 0 ? (recentSleep.reduce((s, l) => s + l.durationHours, 0) / recentSleep.length).toFixed(1) + "h" : "insufficient data"}
- Latest vitals: ${vitalsStr}
    `.trim();
  } catch {
    return "Health data temporarily unavailable.";
  }
}

router.get("/openai/conversations", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);

  const convs = await db.select().from(conversations)
    .where(eq(conversations.userId, user.id))
    .orderBy(desc(conversations.createdAt));

  res.json(convs.map(c => ({ id: c.id, title: c.title, createdAt: c.createdAt })));
});

router.post("/openai/conversations", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [conv] = await db.insert(conversations).values({
    userId: user.id,
    title: parsed.data.title,
  }).returning();

  res.status(201).json({ id: conv.id, title: conv.title, createdAt: conv.createdAt });
});

router.get("/openai/conversations/:id", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [conv] = await db.select().from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, user.id)));
  if (!conv) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const msgs = await db.select().from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  res.json({
    id: conv.id,
    title: conv.title,
    createdAt: conv.createdAt,
    messages: msgs,
  });
});

router.delete("/openai/conversations/:id", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [deleted] = await db.delete(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, user.id)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/openai/conversations/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [conv] = await db.select().from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, user.id)));
  if (!conv) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const msgs = await db.select().from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  res.json(msgs);
});

const geminiTools = [
  {
    functionDeclarations: companionTools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      parameters: {
        type: "OBJECT",
        properties: Object.entries(t.function.parameters.properties).reduce((acc, [k, v]: [string, any]) => {
          acc[k] = {
            type: v.type === "integer" ? "INTEGER" :
                  v.type === "number" ? "NUMBER" : 
                  v.type === "array" ? "ARRAY" : "STRING",
            description: v.description,
            ...(v.type === "array" ? { items: { type: "STRING" } } : {})
          };
          return acc;
        }, {} as any),
        required: t.function.parameters.required || []
      }
    }))
  }
];

async function runGeminiChat(
  systemPrompt: string,
  history: any[],
  currentContent: string,
  userId: number
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const contents: any[] = [];

  for (const msg of history) {
    if (msg.role === "user") {
      contents.push({
        role: "user",
        parts: [{ text: msg.content }]
      });
    } else if (msg.role === "assistant") {
      contents.push({
        role: "model",
        parts: [{ text: msg.content }]
      });
    }
  }

  contents.push({
    role: "user",
    parts: [{ text: currentContent }]
  });

  let toolExecutionCycles = 0;
  let finalResponseText = "";

  while (toolExecutionCycles < 5) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        tools: geminiTools
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as any;
    const candidate = data.candidates?.[0];
    const content = candidate?.content;
    const parts = content?.parts || [];

    const functionCallPart = parts.find((p: any) => p.functionCall);
    const textPart = parts.find((p: any) => p.text);

    if (functionCallPart) {
      const { name, args } = functionCallPart.functionCall;
      contents.push({
        role: "model",
        parts: [functionCallPart]
      });

      const toolResult = await executeTool(name, args, userId);
      contents.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name,
              response: toolResult
            }
          }
        ]
      });

      toolExecutionCycles++;
      continue;
    }

    if (textPart) {
      finalResponseText = textPart.text;
      break;
    }
    break;
  }

  return finalResponseText || "I couldn't generate a response.";
}

async function transcribeAudioWithGemini(audioBase64: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "audio/webm",
                data: audioBase64
              }
            },
            {
              text: "Please transcribe the audio recording exactly. Only output the transcription, do not include any other text."
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini transcription failed: ${response.status}`);
  }

  const data = (await response.json()) as any;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return text?.trim() || "";
}

async function handleFallbackChat(content: string, userId: number, reason: string = "OpenAI quota exceeded"): Promise<string> {
  const text = content.toLowerCase();
  const prefix = `[Fallback Mode: ${reason}]`;
  
  // 1. Hydration Match
  if (text.includes("water") || text.includes("drink") || text.includes("drank") || text.includes("hydrate")) {
    const mlMatch = content.match(/(\d+)\s*(ml|milliliter|milliliters|oz|ounce|ounces)?/i);
    let amountMl = 250;
    if (mlMatch) {
      amountMl = parseInt(mlMatch[1], 10);
    }
    const result = await executeTool("logHydration", { amountMl, note: "Logged via fallback mode" }, userId);
    return `${prefix} I've logged ${amountMl}ml of water for you. ${result.message || ""}`;
  }

  // 2. Sleep Match
  if (text.includes("sleep") || text.includes("slept") || text.includes("bedtime")) {
    const hrMatch = content.match(/(\d+(\.\d+)?)\s*(hour|hours|hr|hrs|h)?/i);
    let durationHours = 8.0;
    if (hrMatch) {
      durationHours = parseFloat(hrMatch[1]);
    }
    const result = await executeTool("logSleep", { durationHours, notes: "Logged via fallback mode" }, userId);
    return `${prefix} I've logged ${durationHours} hours of sleep. ${result.message || ""}`;
  }

  // 3. Complete Habit
  if (text.includes("complete") || text.includes("done") || text.includes("did") || text.includes("check off")) {
    const habits = await db.select().from(habitsTable).where(and(eq(habitsTable.userId, userId), eq(habitsTable.status, "active")));
    let matchedHabit = habits.find(h => text.includes(h.name.toLowerCase()));
    if (matchedHabit) {
      const result = await executeTool("completeHabit", { habitName: matchedHabit.name }, userId);
      return `${prefix} I've marked your habit "${matchedHabit.name}" as completed! ${result.message || ""}`;
    }
  }

  // 4. Create Habit
  if (text.includes("create habit") || text.includes("start habit") || text.includes("new habit")) {
    const keywords = ["create habit", "start habit", "new habit"];
    let habitName = "";
    for (const kw of keywords) {
      const idx = text.indexOf(kw);
      if (idx !== -1) {
        habitName = content.substring(idx + kw.length).trim().replace(/^to\s+/i, "").replace(/^a\s+/i, "");
        break;
      }
    }
    if (habitName) {
      const result = await executeTool("createHabit", { name: habitName }, userId);
      return `${prefix} I've created the habit "${habitName}" for you! ${result.message || ""}`;
    }
  }

  // 5. Vitals Match
  if (text.includes("vitals") || text.includes("blood pressure") || text.includes("bp") || text.includes("weight") || text.includes("heart rate")) {
    const bpMatch = content.match(/(\d{2,3})\/(\d{2,3})/);
    const weightMatch = content.match(/(\d+(\.\d+)?)\s*(kg|lbs|pounds)/i);
    const hrMatch = content.match(/(\d{2,3})\s*(bpm|beats)?/i);

    const args: any = {};
    if (bpMatch) {
      args.systolic = parseInt(bpMatch[1], 10);
      args.diastolic = parseInt(bpMatch[2], 10);
    }
    if (weightMatch) {
      args.weight = parseFloat(weightMatch[1]);
    }
    if (hrMatch) {
      args.heartRate = parseInt(hrMatch[1], 10);
    }

    const result = await executeTool("logVitals", args, userId);
    return `${prefix} I've logged your vitals: ${bpMatch ? `BP ${bpMatch[0]}` : ""} ${weightMatch ? `Weight ${weightMatch[0]}` : ""} ${hrMatch ? `Heart Rate ${hrMatch[0]}` : ""}. ${result.message || ""}`;
  }

  return `${prefix} Hello! Your AI model API key is currently out of quota, invalid, or experiencing connection issues, so I'm running in local fallback mode. I can still help you log your health data! Try saying: "I drank 500ml water", "I slept 8 hours last night", or "complete meditation habit".`;
}

router.post("/openai/conversations/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const parsed = SendOpenaiMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [conv] = await db.select().from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, user.id)));
  if (!conv) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db.insert(messages).values({
    conversationId: id,
    role: "user",
    content: parsed.data.content,
  });

  const history = await db.select().from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt)
    .limit(20);

  const healthContext = await buildHealthContext(user.id);

  const memories = await db.select().from(healthMemoriesTable)
    .where(eq(healthMemoriesTable.userId, user.id))
    .orderBy(desc(healthMemoriesTable.createdAt))
    .limit(10);
  const memoriesContext = memories.length > 0
    ? `\nAURORA'S OBSERVATIONS OF THE USER:\n${memories.map(m => `- ${m.observation}`).join("\n")}`
    : "";

  const systemPrompt = `You are Aurora, a warm and intelligent personal health companion. You help users understand their health data, log activities, and build better habits.

${healthContext}
${memoriesContext}

Guidelines:
- Be concise, warm, and encouraging
- Use the health data above to give personalized responses
- You have tools to log hydration, log sleep, create habits, and complete habits. ALWAYS use them immediately when the user mentions logging, drinking water, sleeping, or completing habits.
- When you use a tool, explain the action directly to the user (e.g. "Great. I've added 500ml to today's hydration progress." or "I've updated your sleep log.").
- Never be preachy or lecture users
- Give actionable, specific advice based on THEIR data
- Keep responses to 2-3 sentences unless the user asks for more detail`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const selectedModel = req.body.model || "openai";

  let chatMessages: any[] = [
    { role: "system", content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
  ];

  try {
    let fullResponse = "";
    if (selectedModel === "gemini") {
      if (process.env.GEMINI_API_KEY) {
        try {
          console.log("Using Gemini API as primary for chat completion");
          fullResponse = await runGeminiChat(systemPrompt, chatMessages.slice(1), parsed.data.content, user.id);
        } catch (geminiErr: any) {
          console.error("Gemini API failed, falling back to local NLP:", geminiErr);
          const isGeminiQuota = geminiErr?.message?.toLowerCase().includes("quota") || geminiErr?.message?.toLowerCase().includes("exhausted") || geminiErr?.status === 429;
          const geminiReason = isGeminiQuota ? "Gemini Quota Exceeded" : "Gemini Connection Failed";
          fullResponse = await handleFallbackChat(parsed.data.content, user.id, geminiReason);
        }
      } else {
        fullResponse = await handleFallbackChat(parsed.data.content, user.id, "Gemini API key is not configured in .env");
      }
    } else {
      try {
        let toolExecutionCycles = 0;

        // Loop to handle tool calling iteratively
        while (toolExecutionCycles < 5) {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: chatMessages,
            tools: companionTools,
            tool_choice: "auto",
            max_tokens: 512,
          });

          const message = completion.choices[0]?.message;
          if (!message) {
            throw new Error("No response from OpenAI");
          }

          if (message.tool_calls && message.tool_calls.length > 0) {
            chatMessages.push(message);

            for (const toolCall of message.tool_calls) {
              if (toolCall.type === "function") {
                const name = toolCall.function.name;
                const args = JSON.parse(toolCall.function.arguments);
                const toolResult = await executeTool(name, args, user.id);

                chatMessages.push({
                  role: "tool",
                  tool_call_id: toolCall.id,
                  content: JSON.stringify(toolResult),
                });
              }
            }
            toolExecutionCycles++;
            continue;
          }

          // No more tool calls, we have the final assistant message content
          fullResponse = message.content || "";
          break;
        }
      } catch (err: any) {
        console.error("OpenAI failed, trying Gemini or fallback:", err);
        const isOpenAiQuota = err?.message?.toLowerCase().includes("quota") || err?.status === 429;
        const openAiReason = isOpenAiQuota ? "OpenAI Quota Exceeded" : "OpenAI Connection Failed";
        
        if (process.env.GEMINI_API_KEY) {
          try {
            console.log("Using Gemini API for chat completion");
            fullResponse = await runGeminiChat(systemPrompt, chatMessages.slice(1), parsed.data.content, user.id);
          } catch (geminiErr: any) {
            console.error("Gemini API failed, falling back to local NLP:", geminiErr);
            const isGeminiQuota = geminiErr?.message?.toLowerCase().includes("quota") || geminiErr?.message?.toLowerCase().includes("exhausted") || geminiErr?.status === 429;
            const geminiReason = isGeminiQuota ? "Gemini Quota Exceeded" : "Gemini Connection Failed";
            fullResponse = await handleFallbackChat(parsed.data.content, user.id, `Both models failed (${openAiReason} & ${geminiReason})`);
          }
        } else {
          console.log("Using local NLP fallback for chat completion");
          fullResponse = await handleFallbackChat(parsed.data.content, user.id, openAiReason);
        }
      }
    }

    // Now stream the final text response to the client
    res.write(`data: ${JSON.stringify({ content: fullResponse })}\n\n`);
    
    await db.insert(messages).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });
  } catch (err: any) {
    console.error("Error in chat completion fallback mode:", err);
    try {
      const isQuota = err?.message?.toLowerCase().includes("quota") || err?.message?.toLowerCase().includes("exhausted") || err?.status === 429;
      const fallbackReason = isQuota ? "AI Quota Exceeded" : "AI Connection Failed";
      const fallbackResponse = await handleFallbackChat(parsed.data.content, user.id, fallbackReason);
      res.write(`data: ${JSON.stringify({ content: fallbackResponse })}\n\n`);
      await db.insert(messages).values({
        conversationId: id,
        role: "assistant",
        content: fallbackResponse,
      });
    } catch (fallbackErr) {
      console.error("Failed to run fallback chat:", fallbackErr);
      res.write(`data: ${JSON.stringify({ error: "Failed to get response" })}\n\n`);
    }
  } finally {
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  }
});

router.post("/openai/conversations/:id/voice-messages", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkId;
  const user = await getOrCreateUser(clerkId);
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const parsed = SendOpenaiVoiceMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [conv] = await db.select().from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, user.id)));
  if (!conv) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const selectedModel = req.body.model || "openai";
  let systemPrompt = "";

  try {
    const healthContext = await buildHealthContext(user.id);
    let userText = "";
    let fullResponse = "";

    if (selectedModel === "gemini" && process.env.GEMINI_API_KEY) {
      console.log("Using Gemini API as primary for voice message");
      userText = await transcribeAudioWithGemini(parsed.data.audio);
      await db.insert(messages).values({ conversationId: id, role: "user", content: userText });
      res.write(`data: ${JSON.stringify({ type: "user_transcript", data: userText })}\n\n`);

      const updatedHistory = await db.select().from(messages)
        .where(eq(messages.conversationId, id))
        .orderBy(messages.createdAt)
        .limit(20);

      const memories = await db.select().from(healthMemoriesTable)
        .where(eq(healthMemoriesTable.userId, user.id))
        .orderBy(desc(healthMemoriesTable.createdAt))
        .limit(10);
      const memoriesContext = memories.length > 0
        ? `\nAURORA'S OBSERVATIONS OF THE USER:\n${memories.map(m => `- ${m.observation}`).join("\n")}`
        : "";

      systemPrompt = `You are Aurora, a warm and intelligent personal health companion. You help users understand their health data, log activities, and build better habits.

${healthContext}
${memoriesContext}

Guidelines:
- Be brief (1-2 sentences), warm, and encouraging.
- You have tools to log hydration, log sleep, create habits, and complete habits. Use them immediately when the user reports logs or habits.
- When you use a tool, confirm the action directly in your response (e.g. "Great. I've added 500ml to today's hydration progress." or "I've updated your sleep log.").`;

      fullResponse = await runGeminiChat(systemPrompt, updatedHistory.slice(0, -1), userText, user.id);
      res.write(`data: ${JSON.stringify({ type: "transcript", data: fullResponse })}\n\n`);
      await db.insert(messages).values({ conversationId: id, role: "assistant", content: fullResponse });
    } else {
      const audioBuffer = Buffer.from(parsed.data.audio, "base64");
      // Transcribe user's voice message
      const { toFile } = await import("openai");
      const audioFile = await toFile(audioBuffer, "voice.webm", { type: "audio/webm" });
      const transcription = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: audioFile,
      });
      userText = transcription.text;

      await db.insert(messages).values({ conversationId: id, role: "user", content: userText });
      res.write(`data: ${JSON.stringify({ type: "user_transcript", data: userText })}\n\n`);

      const history = await db.select().from(messages)
        .where(eq(messages.conversationId, id))
        .orderBy(messages.createdAt)
        .limit(20);

      const memories = await db.select().from(healthMemoriesTable)
        .where(eq(healthMemoriesTable.userId, user.id))
        .orderBy(desc(healthMemoriesTable.createdAt))
        .limit(10);
      const memoriesContext = memories.length > 0
        ? `\nAURORA'S OBSERVATIONS OF THE USER:\n${memories.map(m => `- ${m.observation}`).join("\n")}`
        : "";

      systemPrompt = `You are Aurora, a warm and intelligent personal health companion. You help users understand their health data, log activities, and build better habits.

${healthContext}
${memoriesContext}

Guidelines:
- Be brief (1-2 sentences), warm, and encouraging.
- You have tools to log hydration, log sleep, create habits, and complete habits. Use them immediately when the user reports logs or habits.
- When you use a tool, confirm the action directly in your response (e.g. "Great. I've added 500ml to today's hydration progress." or "I've updated your sleep log.").`;

      let chatMessages: any[] = [
        { role: "system", content: systemPrompt },
        ...history.map(m => ({ role: m.role, content: m.content })),
      ];

      let toolExecutionCycles = 0;
      // Loop to handle tool calling iteratively
      while (toolExecutionCycles < 5) {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: chatMessages,
          tools: companionTools,
          tool_choice: "auto",
          max_tokens: 256,
        });

        const message = completion.choices[0]?.message;
        if (!message) {
          throw new Error("No response from OpenAI");
        }

        if (message.tool_calls && message.tool_calls.length > 0) {
          chatMessages.push(message);

          for (const toolCall of message.tool_calls) {
            if (toolCall.type === "function") {
              const name = toolCall.function.name;
              const args = JSON.parse(toolCall.function.arguments);
              const toolResult = await executeTool(name, args, user.id);

              chatMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(toolResult),
              });
            }
          }
          toolExecutionCycles++;
          continue;
        }

        // No more tool calls
        fullResponse = message.content || "";
        break;
      }

      // Convert response to speech
      const ttsResponse = await openai.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: fullResponse,
        response_format: "mp3",
      });

      const audioData = Buffer.from(await ttsResponse.arrayBuffer()).toString("base64");
      res.write(`data: ${JSON.stringify({ type: "transcript", data: fullResponse })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: "audio", data: audioData, format: "mp3" })}\n\n`);

      await db.insert(messages).values({ conversationId: id, role: "assistant", content: fullResponse });
    }
  } catch (err: any) {
    console.error("Error in voice message route, trying Gemini or fallback mode:", err);
    try {
      let fallbackResponse = "";
      let userText = "";
      
      if (process.env.GEMINI_API_KEY) {
        console.log("Using Gemini API for voice transcription and chat");
        userText = await transcribeAudioWithGemini(parsed.data.audio);
        await db.insert(messages).values({ conversationId: id, role: "user", content: userText });
        res.write(`data: ${JSON.stringify({ type: "user_transcript", data: userText })}\n\n`);
        
        const updatedHistory = await db.select().from(messages)
          .where(eq(messages.conversationId, id))
          .orderBy(messages.createdAt)
          .limit(20);
          
        if (!systemPrompt) {
          const healthContext = await buildHealthContext(user.id);
          const memories = await db.select().from(healthMemoriesTable)
            .where(eq(healthMemoriesTable.userId, user.id))
            .orderBy(desc(healthMemoriesTable.createdAt))
            .limit(10);
          const memoriesContext = memories.length > 0
            ? `\nAURORA'S OBSERVATIONS OF THE USER:\n${memories.map(m => `- ${m.observation}`).join("\n")}`
            : "";
          systemPrompt = `You are Aurora, a warm and intelligent personal health companion. You help users understand their health data, log activities, and build better habits.

${healthContext}
${memoriesContext}

Guidelines:
- Be brief (1-2 sentences), warm, and encouraging.
- You have tools to log hydration, log sleep, create habits, and complete habits. Use them immediately when the user reports logs or habits.
- When you use a tool, confirm the action directly in your response (e.g. "Great. I've added 500ml to today's hydration progress." or "I've updated your sleep log.").`;
        }
        
        fallbackResponse = await runGeminiChat(systemPrompt, updatedHistory.slice(0, -1), userText, user.id);
      } else {
        fallbackResponse = `[Fallback Mode: OpenAI quota exceeded] I received your voice recording, but I cannot process audio transcription because the OpenAI API key is out of quota. Please type your message in the chat box instead!`;
      }
      
      res.write(`data: ${JSON.stringify({ type: "transcript", data: fallbackResponse })}\n\n`);
      await db.insert(messages).values({
        conversationId: id,
        role: "assistant",
        content: fallbackResponse,
      });
    } catch (fallbackErr) {
      console.error("Failed to run fallback voice:", fallbackErr);
      res.write(`data: ${JSON.stringify({ error: "Failed to process voice message" })}\n\n`);
    }
  } finally {
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  }
});

export default router;
