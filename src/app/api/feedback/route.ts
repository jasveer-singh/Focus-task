import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.feedbackItem.findMany({
    where: { userId: session.user.id },
    orderBy: { receivedAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const item = await prisma.feedbackItem.create({
    data: {
      userId: session.user.id,
      from: body.from,
      message: body.message,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
      status: body.status ?? "new",
    },
  });
  return NextResponse.json(item, { status: 201 });
}
