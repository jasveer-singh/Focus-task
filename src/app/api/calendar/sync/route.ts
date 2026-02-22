import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import { syncGoogleEventsToLocal } from "@/lib/calendar";

export async function POST() {
  try {
    const user = await requireCurrentUser();
    const result = await syncGoogleEventsToLocal(user.id);

    return NextResponse.json({
      synced: result.syncedCount,
      totalFromGoogle: result.totalFromGoogle,
      skippedCancelled: result.skippedCancelled,
      skippedInvalidTime: result.skippedInvalidTime
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
