import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json();
    const { sourceId, sourceType, title, dueAt, reminderWindows } = body as {
      sourceId: string;
      sourceType: string;
      title: string;
      dueAt: string;
      reminderWindows: number[];
    };

    if (!sourceId || !sourceType || !title || !dueAt || !Array.isArray(reminderWindows)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const dueDate = new Date(dueAt);
    if (Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: "Invalid dueAt" }, { status: 400 });
    }

    // Remove existing unset notifications for this source
    await prisma.scheduledNotification.deleteMany({
      where: { userId: user.id, sourceId, sentAt: null }
    });

    const now = new Date();
    const notifications = [];

    for (const windowMinutes of reminderWindows) {
      const scheduledAt = new Date(dueDate.getTime() - windowMinutes * 60_000);
      if (scheduledAt <= now) continue;

      const minutesLabel =
        windowMinutes < 60
          ? `${windowMinutes} minutes`
          : windowMinutes < 1440
          ? `${windowMinutes / 60} hour${windowMinutes / 60 === 1 ? "" : "s"}`
          : `${windowMinutes / 1440} day`;

      notifications.push({
        userId: user.id,
        sourceId,
        sourceType,
        title: `Upcoming: ${title}`,
        body: `Due in ${minutesLabel}`,
        scheduledAt
      });
    }

    // Also schedule an "at due time" notification
    if (dueDate > now) {
      notifications.push({
        userId: user.id,
        sourceId,
        sourceType,
        title: `Due now: ${title}`,
        body: "This task is due.",
        scheduledAt: dueDate
      });
    }

    if (notifications.length > 0) {
      await prisma.scheduledNotification.createMany({ data: notifications });
    }

    return NextResponse.json({ ok: true, scheduled: notifications.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireCurrentUser();
    const { searchParams } = new URL(request.url);
    const sourceId = searchParams.get("sourceId");

    if (!sourceId) {
      return NextResponse.json({ error: "Missing sourceId" }, { status: 400 });
    }

    await prisma.scheduledNotification.deleteMany({
      where: { userId: user.id, sourceId, sentAt: null }
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
