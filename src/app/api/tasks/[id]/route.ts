import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createGoogleCalendarEvent, updateGoogleCalendarEvent, deleteGoogleCalendarEvent } from "@/lib/calendar";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task || task.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.completed !== undefined && { completed: body.completed }),
      ...(body.inProgress !== undefined && { inProgress: body.inProgress }),
      ...(body.pinned !== undefined && { pinned: body.pinned }),
      ...("dueAt" in body && { dueAt: body.dueAt ? new Date(body.dueAt) : null }),
      ...(body.projectId !== undefined && { projectId: body.projectId }),
      ...(body.checklist !== undefined && { checklist: body.checklist }),
    },
  });

  // Sync to Google Calendar when title or dueAt changes
  const titleChanged = body.title !== undefined && body.title !== task.title;
  const dueAtChanged = "dueAt" in body;

  if (titleChanged || dueAtChanged) {
    const newDueAt = updated.dueAt;
    const newTitle = updated.title;

    try {
      if (task.calendarEventId) {
        if (newDueAt) {
          // Update existing event
          const end = new Date(newDueAt.getTime() + 30 * 60 * 1000);
          await updateGoogleCalendarEvent(session.user.id, task.calendarEventId, {
            title: newTitle,
            startAt: newDueAt,
            endAt: end,
          });
        } else {
          // Due date removed — delete the calendar event
          await deleteGoogleCalendarEvent(session.user.id, task.calendarEventId);
          await prisma.task.update({ where: { id }, data: { calendarEventId: null } });
        }
      } else if (newDueAt) {
        // No existing event but now has a due date — create one
        const end = new Date(newDueAt.getTime() + 30 * 60 * 1000);
        const { externalId } = await createGoogleCalendarEvent(session.user.id, {
          title: newTitle,
          startAt: newDueAt,
          endAt: end,
          participants: [],
          location: null,
          meetLink: null,
        });
        if (externalId) {
          await prisma.task.update({ where: { id }, data: { calendarEventId: externalId } });
        }
      }
    } catch (err) {
      // Calendar sync is best-effort — task update already saved, don't fail the request
      console.error("[calendar] Failed to sync calendar event for task update:", err);
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task || task.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete calendar event if one was created
  if (task.calendarEventId) {
    try {
      await deleteGoogleCalendarEvent(session.user.id, task.calendarEventId);
    } catch (err) {
      console.error("[calendar] Failed to delete calendar event on task delete:", err);
    }
  }

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
