"use client";

import { useEffect, useMemo, useState } from "react";

type CalendarEvent = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  participants: string[] | null;
  location: string | null;
  meetLink: string | null;
  source: string;
  externalId: string | null;
};

type ConnectionInfo = {
  userEmail?: string | null;
  googleProfileEmail?: string | null;
  connected: boolean;
  hasRefreshToken: boolean;
  hasAccessToken: boolean;
  scope: string | null;
  expiresAt: number | null;
};

function toDateTimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

export default function CalendarSyncPanel() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionInfo | null>(null);

  const [title, setTitle] = useState("");
  const [participants, setParticipants] = useState("");
  const [location, setLocation] = useState("");
  const [meetLink, setMeetLink] = useState("");
  const [startAt, setStartAt] = useState(toDateTimeLocalValue(new Date()));
  const [endAt, setEndAt] = useState(
    toDateTimeLocalValue(new Date(Date.now() + 60 * 60 * 1000))
  );

  async function loadEvents() {
    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch("/api/calendar/events", { cache: "no-store" });
      const payload = (await response.json()) as {
        events?: CalendarEvent[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "Failed to load events");
      setEvents(payload.events ?? []);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  async function loadConnection() {
    try {
      const response = await fetch("/api/calendar/connection", {
        cache: "no-store"
      });
      const payload = (await response.json()) as ConnectionInfo & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Failed to load connection");
      setConnection({
        connected: payload.connected,
        hasRefreshToken: payload.hasRefreshToken,
        hasAccessToken: payload.hasAccessToken,
        scope: payload.scope,
        expiresAt: payload.expiresAt
      });
    } catch {
      setConnection(null);
    }
  }

  useEffect(() => {
    loadEvents();
    loadConnection();
  }, []);

  async function runSync() {
    setSyncing(true);
    setStatus(null);
    try {
      const response = await fetch("/api/calendar/sync", { method: "POST" });
      const payload = (await response.json()) as {
        synced?: number;
        totalFromGoogle?: number;
        skippedCancelled?: number;
        skippedInvalidTime?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error || "Sync failed");
      setStatus(
        `Google returned ${payload.totalFromGoogle ?? 0}; synced ${payload.synced ?? 0}; skipped cancelled ${payload.skippedCancelled ?? 0}; skipped invalid time ${payload.skippedInvalidTime ?? 0}.`
      );
      await loadEvents();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function createEvent() {
    if (!title.trim()) {
      setStatus("Event title is required.");
      return;
    }

    setStatus(null);
    try {
      const response = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          participants,
          location,
          meetLink
        })
      });

      const payload = (await response.json()) as {
        event?: CalendarEvent;
        googleSyncError?: string | null;
        error?: string;
      };

      if (!response.ok) throw new Error(payload.error || "Failed to create event");

      setTitle("");
      setParticipants("");
      setLocation("");
      setMeetLink("");
      if (payload.googleSyncError) {
        setStatus(
          `Event saved locally. Google sync failed: ${payload.googleSyncError}`
        );
      } else {
        setStatus("Event created and synced to Google.");
      }
      await loadEvents();
      await loadConnection();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to create event");
    }
  }

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt)),
    [events]
  );

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-10 md:px-12">
      <div className="rounded-3xl bg-white p-6 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-ink-300">Calendar Sync</p>
            <h2 className="font-display text-2xl font-semibold text-ink-900">
              Google Calendar Events
            </h2>
          </div>
          <button
            type="button"
            onClick={runSync}
            disabled={syncing}
            className="rounded-full border border-mist-200 bg-white px-4 py-2 text-xs font-semibold text-ink-500 transition hover:border-accent-500 hover:text-accent-500 disabled:opacity-60"
          >
            {syncing ? "Syncing..." : "Sync from Google"}
          </button>
        </div>
        <div className="mb-4 rounded-2xl border border-mist-200 bg-mist-50 px-4 py-3 text-xs text-ink-500">
          {connection ? (
            <div className="flex flex-wrap items-center gap-3">
              <span>App user: {connection.userEmail || "unknown"}</span>
              <span>
                Google user: {connection.googleProfileEmail || "unavailable"}
              </span>
              <span>Connected: {connection.connected ? "yes" : "no"}</span>
              <span>Refresh token: {connection.hasRefreshToken ? "yes" : "no"}</span>
              <span>Access token: {connection.hasAccessToken ? "yes" : "no"}</span>
              <span>
                Scope: {connection.scope?.includes("calendar") ? "calendar ok" : "calendar missing"}
              </span>
            </div>
          ) : (
            <span>Connection status unavailable.</span>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-mist-200 bg-mist-50 p-4">
            <h3 className="text-sm font-semibold text-ink-700">Create Event</h3>
            <div className="mt-3 flex flex-col gap-3">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Event title"
                className="rounded-xl border border-mist-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(event) => setStartAt(event.target.value)}
                  className="rounded-xl border border-mist-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500"
                />
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(event) => setEndAt(event.target.value)}
                  className="rounded-xl border border-mist-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500"
                />
              </div>
              <input
                value={participants}
                onChange={(event) => setParticipants(event.target.value)}
                placeholder="Participants emails (comma-separated)"
                className="rounded-xl border border-mist-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500"
              />
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Location"
                className="rounded-xl border border-mist-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500"
              />
              <input
                value={meetLink}
                onChange={(event) => setMeetLink(event.target.value)}
                placeholder="Meet link"
                className="rounded-xl border border-mist-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500"
              />
              <button
                type="button"
                onClick={createEvent}
                className="rounded-xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:bg-accent-600"
              >
                Create and Sync
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-mist-200 bg-mist-50 p-4">
            <h3 className="text-sm font-semibold text-ink-700">Synced Events</h3>
            <div className="mt-3 max-h-[420px] space-y-2 overflow-auto pr-1">
              {loading ? (
                <p className="text-sm text-ink-500">Loading events...</p>
              ) : sortedEvents.length === 0 ? (
                <p className="text-sm text-ink-500">No events yet.</p>
              ) : (
                sortedEvents.map((event) => (
                  <article
                    key={event.id}
                    className="rounded-xl border border-mist-200 bg-white px-3 py-3"
                  >
                    <h4 className="text-sm font-semibold text-ink-900">{event.title}</h4>
                    <p className="mt-1 text-xs text-ink-500">
                      {new Date(event.startAt).toLocaleString()} - {new Date(event.endAt).toLocaleString()}
                    </p>
                    {Array.isArray(event.participants) && event.participants.length > 0 ? (
                      <p className="mt-1 text-xs text-ink-500">
                        Participants: {event.participants.join(", ")}
                      </p>
                    ) : null}
                    {event.location ? (
                      <p className="mt-1 text-xs text-ink-500">Location: {event.location}</p>
                    ) : null}
                    {event.meetLink ? (
                      <a
                        href={event.meetLink}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-xs font-semibold text-accent-600 hover:underline"
                      >
                        Open meeting link
                      </a>
                    ) : null}
                    <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-ink-300">
                      Source: {event.source}
                    </p>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>

        {status ? <p className="mt-4 text-sm text-ink-500">{status}</p> : null}
      </div>
    </section>
  );
}
