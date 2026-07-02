import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ideas = await prisma.idea.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(ideas);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const idea = await prisma.idea.create({
    data: {
      userId: session.user.id,
      title: body.title,
      notes: body.notes ?? "",
      sourceUrl: body.sourceUrl ?? null,
      space: body.space === "personal" ? "personal" : "professional",
    },
  });
  return NextResponse.json(idea, { status: 201 });
}
