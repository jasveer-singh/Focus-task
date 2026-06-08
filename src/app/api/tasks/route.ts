import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createGoogleCalendarEvent } from "@/lib/calendar";

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

  console.log(`[tasks/POST] Creating task for user=${session.user.id} title="${body.title}" dueAt=${dueAt?.toISOString() ?? "none"}`);

  const task = await prisma.task.create({
    data: {
      userId: session.user.id,
      title: body.title,
      notes: body.notes ?? "",
      dueAt,
      projectId: body.projectId ?? null,
    },
  });

  console.log(`[tasks/POST] Task created id=${task.id}`);

  // Push to Google Calendar if the task has a due date
  if (!dueAt) {
    console.log(`[tasks/POST] No dueAt — skipping calendar sync`);
    return NextResponse.json({ ...task, _calendarStatus: "skipped_no_due_date" }, { status: 201 });
  }

  let calendarStatus = "not_attempted";
  try {
    // Check if a Google account exists for this user
    const googleAccount = await prisma.account.findFirst({
      where: { userId: session.user.id, provider: "google" },
      select: { id: true, access_token: true, refresh_token: true, expires_at: true, scope: true },
    });

    if (!googleAccount) {
      console.warn(`[tasks/POST] No Google account linked for user=${session.user.id} — skipping calendar sync`);
      calendarStatus = "skipped_no_google_account";
    } else {
      console.log(`[tasks/POST] Google account found id=${googleAccount.id} scope="${googleAccount.scope}" has_refresh_token=${!!googleAccount.refresh_token}`);

      const end = new Date(dueAt.getTime() + 30 * 60 * 1000);
      console.log(`[tasks/POST] Calling createGoogleCalendarEvent start=${dueAt.toISOString()} end=${end.toISOString()}`);

      const { externalId } = await createGoogleCalendarEvent(session.user.id, {
        title: task.title,
        startAt: dueAt,
        endAt: end,
        participants: [],
        location: null,
        meetLink: null,
      });

      console.log(`[tasks/POST] Calendar event created externalId=${externalId}`);

      if (externalId) {
        await prisma.task.update({
          where: { id: task.id },
          data: { calendarEventId: externalId },
        });
        task.calendarEventId = externalId;
        calendarStatus = "synced";
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[tasks/POST] Calendar sync failed: ${message}`);
    calendarStatus = `error: ${message}`;
  }

  console.log(`[tasks/POST] Done calendarStatus=${calendarStatus}`);
  return NextResponse.json({ ...task, _calendarStatus: calendarStatus }, { status: 201 });
}
