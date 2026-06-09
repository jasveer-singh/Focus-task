import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createGoogleCalendarEvent, updateGoogleCalendarEvent, deleteGoogleCalendarEvent } from "@/lib/calendar";

// Fields whose changes should trigger a calendar event sync
const CALENDAR_FIELDS = new Set(["title", "notes", "dueAt", "completed", "inProgress", "projectId", "checklist"]);

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
      ...(body.title      !== undefined && { title:      body.title }),
      ...(body.notes      !== undefined && { notes:      body.notes }),
      ...(body.completed  !== undefined && { completed:  body.completed }),
      ...(body.inProgress !== undefined && { inProgress: body.inProgress }),
      ...(body.pinned     !== undefined && { pinned:     body.pinned }),
      ...("dueAt" in body              && { dueAt:      body.dueAt ? new Date(body.dueAt) : null }),
      ...(body.projectId  !== undefined && { projectId:  body.projectId }),
      ...(body.checklist  !== undefined && { checklist:  body.checklist }),
    },
  });

  // Decide whether a calendar sync is needed
  const calendarRelevantChange = Object.keys(body).some((k) => CALENDAR_FIELDS.has(k));

  if (calendarRelevantChange) {
    const newDueAt = updated.dueAt;

    try {
      // Resolve project name
      let projectName: string | null = null;
      if (updated.projectId) {
        const project = await prisma.project.findUnique({ where: { id: updated.projectId }, select: { title: true } });
        projectName = project?.title ?? null;
      }

      const checklist = Array.isArray(updated.checklist)
        ? (updated.checklist as Array<{ text: string; done: boolean }>)
        : null;

      if (task.calendarEventId) {
        if (newDueAt) {
          // Update existing event with full context
          const end = new Date(newDueAt.getTime() + 30 * 60 * 1000);
          await updateGoogleCalendarEvent(session.user.id, task.calendarEventId, {
            title:       updated.title,
            startAt:     newDueAt,
            endAt:       end,
            notes:       updated.notes || null,
            projectName,
            checklist,
            completed:   updated.completed,
            inProgress:  updated.inProgress,
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
          title:       updated.title,
          startAt:     newDueAt,
          endAt:       end,
          notes:       updated.notes || null,
          projectName,
          checklist,
          completed:   updated.completed,
          inProgress:  updated.inProgress,
        });
        if (externalId) {
          await prisma.task.update({ where: { id }, data: { calendarEventId: externalId } });
        }
      }
    } catch (err) {
      // Best-effort — task is already saved, don't fail the request
      console.error(`[tasks/PATCH] Calendar sync failed for task ${id}:`, err instanceof Error ? err.message : err);
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

  if (task.calendarEventId) {
    try {
      await deleteGoogleCalendarEvent(session.user.id, task.calendarEventId);
    } catch (err) {
      console.error(`[tasks/DELETE] Calendar event delete failed:`, err instanceof Error ? err.message : err);
    }
  }

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
