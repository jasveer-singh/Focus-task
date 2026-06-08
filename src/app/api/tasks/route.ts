import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createGoogleCalendarEvent, updateGoogleCalendarEvent } from "@/lib/calendar";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tasks = await prisma.task.findMany({
    where: { userId: session.user.id },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const dueAt = body.dueAt ? new Date(body.dueAt) : null;

  const task = await prisma.task.create({
    data: {
      userId: session.user.id,
      title: body.title,
      notes: body.notes ?? "",
      dueAt,
      projectId: body.projectId ?? null,
    },
  });

  // Push to Google Calendar if the task has a due date
  if (dueAt) {
    try {
      const end = new Date(dueAt.getTime() + 30 * 60 * 1000); // 30-min block
      const { externalId } = await createGoogleCalendarEvent(session.user.id, {
        title: task.title,
        startAt: dueAt,
        endAt: end,
        participants: [],
        location: null,
        meetLink: null,
      });

      if (externalId) {
        await prisma.task.update({
          where: { id: task.id },
          data: { calendarEventId: externalId },
        });
        task.calendarEventId = externalId;
      }
    } catch (err) {
      // Calendar sync is best-effort — task is already created, don't fail the request
      console.error("[calendar] Failed to create calendar event for task:", err);
    }
  }

  return NextResponse.json(task, { status: 201 });
}
