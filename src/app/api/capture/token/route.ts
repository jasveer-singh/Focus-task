import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Returns the current capture token, creating one on first call.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { captureToken: true } });
  if (!user?.captureToken) {
    const token = randomBytes(24).toString("base64url");
    await prisma.user.update({ where: { id: session.user.id }, data: { captureToken: token } });
    user = { captureToken: token };
  }
  return NextResponse.json({ token: user.captureToken });
}

// Rotates the token (invalidates the old one).
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = randomBytes(24).toString("base64url");
  await prisma.user.update({ where: { id: session.user.id }, data: { captureToken: token } });
  return NextResponse.json({ token });
}
