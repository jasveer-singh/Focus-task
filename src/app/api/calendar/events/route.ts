import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/current-user";
import { createGoogleCalendarEvent } from "@/lib/calendar";

function parseParticipants(input: unknown) {
  if (Array.isArray(input)) {
    return input
      .map((entry) => String(entry).trim())
      .filter((entry) => entry.length > 0);
  }

  if (typeof input === "string") {
    return input
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [];
}

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const events = await prisma.calendarEvent.findMany({
      where: { userId: user.id },
      orderBy: { startAt: "asc" },
      take: 100
    });

    return NextResponse.json({ events });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = (await request.json()) as {
      title?: string;
      startAt?: string;
      endAt?: string;
      participants?: string[] | string;
      location?: string;
      meetLink?: string;
    };

    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const startAt = body.startAt ? new Date(body.startAt) : null;
    const endAt = body.endAt ? new Date(body.endAt) : null;

    if (!startAt || Number.isNaN(startAt.getTime()) || !endAt || Number.isNaN(endAt.getTime())) {
      return NextResponse.json(
        { error: "Valid start and end time are required" },
        { status: 400 }
      );
    }

    if (endAt <= startAt) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    const participants = parseParticipants(body.participants);
    let externalId: string | null = null;
    let syncedMeetLink: string | null = body.meetLink?.trim() || null;

    let googleSyncError: string | null = null;
    try {
      const googleEvent = await createGoogleCalendarEvent(user.id, {
        title,
        startAt,
        endAt,
        participants,
        location: body.location?.trim() || null,
        meetLink: body.meetLink?.trim() || null
      });
      externalId = googleEvent.externalId;
      syncedMeetLink = googleEvent.meetLink || syncedMeetLink;
    } catch (error) {
      googleSyncError =
        error instanceof Error ? error.message : "Google sync failed";
    }

    const event = await prisma.calendarEvent.create({
      data: {
        userId: user.id,
        title,
        startAt,
        endAt,
        participants,
        location: body.location?.trim() || null,
        meetLink: syncedMeetLink,
        source: externalId ? "app+google" : "app",
        externalId
      }
    });

    return NextResponse.json(
      {
        event,
        googleSyncError
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
