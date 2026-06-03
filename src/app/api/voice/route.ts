import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are a productivity assistant that parses natural language voice commands into structured actions for the Suru app.

The app has these entity types: task, project, idea, feedback.

Parse the user's input and return ONLY valid JSON with this shape:
{
  "type": "task" | "project" | "idea" | "feedback",
  "title": "string",
  "notes": "string (optional, empty string if none)",
  "dueAt": "ISO 8601 datetime string or null",
  "status": "planning" | "active" | "on-hold" | "completed" (only for project),
  "from": "string (only for feedback — who gave it)",
  "projectId": null
}

Rules:
- Today's date/time is provided in the user message. Use it to resolve relative times like "tomorrow", "in 2 hours", "next Monday".
- If the user says "remind me", "task", "add", "create" → type: task
- If the user says "project", "initiative", "campaign" → type: project
- If the user says "idea", "thought", "note" → type: idea
- If the user says "feedback" → type: feedback
- Extract due dates and times accurately. "tomorrow at 3pm" = next day at 15:00.
- Keep title concise (the core action/name). Put extra detail in notes.
- Return ONLY the JSON object. No explanation, no markdown.`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "No text provided" }, { status: 400 });

  const now = new Date().toISOString();
  const userMessage = `Current date/time: ${now}\n\nUser said: "${text}"`;

  const message = await client.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 512,
    system: SYSTEM,
    messages: [{ role: "user", content: userMessage }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Failed to parse intent", raw }, { status: 422 });
  }

  const userId = session.user.id;
  const type = parsed.type as string;

  if (type === "task") {
    const task = await prisma.task.create({
      data: {
        userId,
        title: String(parsed.title || "Untitled task"),
        notes: String(parsed.notes || ""),
        dueAt: parsed.dueAt ? new Date(parsed.dueAt as string) : null,
        projectId: parsed.projectId ? String(parsed.projectId) : null,
      },
    });
    return NextResponse.json({ ok: true, type: "task", entity: task });
  }

  if (type === "project") {
    const project = await prisma.project.create({
      data: {
        userId,
        title: String(parsed.title || "Untitled project"),
        description: String(parsed.notes || ""),
        status: String(parsed.status || "planning"),
      },
    });
    return NextResponse.json({ ok: true, type: "project", entity: project });
  }

  if (type === "idea") {
    const idea = await prisma.idea.create({
      data: {
        userId,
        title: String(parsed.title || "Untitled idea"),
        notes: String(parsed.notes || ""),
      },
    });
    return NextResponse.json({ ok: true, type: "idea", entity: idea });
  }

  if (type === "feedback") {
    const item = await prisma.feedbackItem.create({
      data: {
        userId,
        from: String(parsed.from || "Unknown"),
        message: String(parsed.title || ""),
        dueAt: parsed.dueAt ? new Date(parsed.dueAt as string) : null,
      },
    });
    return NextResponse.json({ ok: true, type: "feedback", entity: item });
  }

  return NextResponse.json({ error: "Unknown type", parsed }, { status: 422 });
}
