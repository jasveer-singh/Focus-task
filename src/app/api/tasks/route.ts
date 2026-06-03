import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tasks = await prisma.task.findMany({
    where: { userId: session.user.id },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const task = await prisma.task.create({
    data: {
      userId: session.user.id,
      title: body.title,
      notes: body.notes ?? "",
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
      projectId: body.projectId ?? null,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
