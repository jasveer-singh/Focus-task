import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { getGoogleProfileEmail } from "@/lib/calendar";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    const account = await prisma.account.findFirst({
      where: { userId: user.id, provider: "google" },
      select: { scope: true, refresh_token: true, access_token: true, expires_at: true }
    });

    let googleProfileEmail: string | null = null;
    if (account) {
      googleProfileEmail = await getGoogleProfileEmail(user.id);
    }

    return NextResponse.json({
      userEmail: user.email,
      connected: Boolean(account),
      hasRefreshToken: Boolean(account?.refresh_token),
      hasAccessToken: Boolean(account?.access_token),
      scope: account?.scope ?? null,
      expiresAt: account?.expires_at ?? null,
      googleProfileEmail
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
