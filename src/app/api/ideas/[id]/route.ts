import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const idea = await prisma.idea.findUnique({ where: { id } });
  if (!idea || idea.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.idea.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.sourceUrl !== undefined && { sourceUrl: body.sourceUrl }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const idea = await prisma.idea.findUnique({ where: { id } });
  if (!idea || idea.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.idea.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
