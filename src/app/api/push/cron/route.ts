import webpush from "web-push";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 60_000); // 1 minute lookahead

  const due = await prisma.scheduledNotification.findMany({
    where: { scheduledAt: { lte: windowEnd }, sentAt: null },
    include: { user: { include: { pushSubscriptions: true } } },
    take: 100
  });

  const results = await Promise.allSettled(
    due.map(async (notification) => {
      const subs = notification.user.pushSubscriptions;
      if (subs.length === 0) return;

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        tag: `${notification.sourceType}-${notification.sourceId}`,
        data: { url: "/", sourceId: notification.sourceId, sourceType: notification.sourceType }
      });

      await Promise.allSettled(
        subs.map(async (sub) => {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload
            );
          } catch (err: unknown) {
            const status = (err as { statusCode?: number }).statusCode;
            if (status === 410 || status === 404) {
              await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
            }
          }
        })
      );

      await prisma.scheduledNotification.update({
        where: { id: notification.id },
        data: { sentAt: now }
      });
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ ok: true, sent });
}
