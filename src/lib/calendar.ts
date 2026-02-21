import { prisma } from "@/lib/prisma";

type GoogleEventDateTime = {
  dateTime?: string;
  date?: string;
  timeZone?: string;
};

type GoogleEvent = {
  id: string;
  summary?: string;
  start?: GoogleEventDateTime;
  end?: GoogleEventDateTime;
  attendees?: Array<{ email?: string }>;
  location?: string;
  hangoutLink?: string;
  htmlLink?: string;
  updated?: string;
  status?: string;
};

function parseDateTime(value?: GoogleEventDateTime) {
  if (!value) return null;
  if (value.dateTime) return new Date(value.dateTime);
  if (value.date) return new Date(`${value.date}T00:00:00.000Z`);
  return null;
}

function getGoogleMeetOrLocationLink(event: GoogleEvent) {
  if (event.hangoutLink) return event.hangoutLink;
  if (event.location && /^https?:\/\//i.test(event.location)) return event.location;
  return event.htmlLink ?? null;
}

export async function getGoogleAccessTokenForUser(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" }
  });

  if (!account) {
    throw new Error("Google account not connected");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAt = account.expires_at ?? 0;

  if (account.access_token && expiresAt > nowSeconds + 60) {
    return account.access_token;
  }

  if (!account.refresh_token) {
    throw new Error("Google refresh token missing. Re-authenticate with Google.");
  }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    grant_type: "refresh_token",
    refresh_token: account.refresh_token
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to refresh Google token: ${details}`);
  }

  const payload = (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
  };

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: payload.access_token,
      expires_at: nowSeconds + payload.expires_in,
      refresh_token: payload.refresh_token ?? account.refresh_token,
      scope: payload.scope ?? account.scope,
      token_type: payload.token_type ?? account.token_type
    }
  });

  return payload.access_token;
}

export async function listGoogleCalendarEvents(userId: string) {
  const accessToken = await getGoogleAccessTokenForUser(userId);

  const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

  const query = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin,
    timeMax,
    maxResults: "250"
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${query.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to fetch Google Calendar events: ${details}`);
  }

  const payload = (await response.json()) as { items?: GoogleEvent[] };
  return payload.items ?? [];
}

export async function createGoogleCalendarEvent(
  userId: string,
  input: {
    title: string;
    startAt: Date;
    endAt: Date;
    participants: string[];
    location?: string | null;
    meetLink?: string | null;
  }
) {
  const accessToken = await getGoogleAccessTokenForUser(userId);

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        summary: input.title,
        start: { dateTime: input.startAt.toISOString() },
        end: { dateTime: input.endAt.toISOString() },
        attendees: input.participants
          .filter(Boolean)
          .map((email) => ({ email: email.trim() })),
        location: input.location || undefined,
        description: input.meetLink
          ? `Meet link: ${input.meetLink}`
          : undefined
      })
    }
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to create Google Calendar event: ${details}`);
  }

  const event = (await response.json()) as GoogleEvent;
  return {
    externalId: event.id,
    meetLink: getGoogleMeetOrLocationLink(event)
  };
}

export async function syncGoogleEventsToLocal(userId: string) {
  const googleEvents = await listGoogleCalendarEvents(userId);

  let syncedCount = 0;
  for (const event of googleEvents) {
    if (!event.id || event.status === "cancelled") continue;

    const start = parseDateTime(event.start);
    const end = parseDateTime(event.end);
    if (!start || !end) continue;

    const participants = (event.attendees ?? [])
      .map((entry) => entry.email)
      .filter((email): email is string => Boolean(email));

    await prisma.calendarEvent.upsert({
      where: {
        userId_externalId: {
          userId,
          externalId: event.id
        }
      },
      update: {
        title: event.summary || "Untitled event",
        startAt: start,
        endAt: end,
        participants,
        location: event.location,
        meetLink: getGoogleMeetOrLocationLink(event),
        source: "google"
      },
      create: {
        userId,
        title: event.summary || "Untitled event",
        startAt: start,
        endAt: end,
        participants,
        location: event.location,
        meetLink: getGoogleMeetOrLocationLink(event),
        source: "google",
        externalId: event.id
      }
    });

    syncedCount += 1;
  }

  return { syncedCount };
}
