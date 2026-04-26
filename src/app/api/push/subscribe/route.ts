import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const body = await request.json();
    const { endpoint, keys } = body as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth, userId: user.id },
      create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth }
    });

    return NextResponse.json({ ok: true });
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
    const { endpoint } = await request.json();
    if (endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { userId: user.id, endpoint }
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
