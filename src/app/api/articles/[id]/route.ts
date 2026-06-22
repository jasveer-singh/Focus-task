import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const article = await prisma.article.findUnique({ where: { id } });
  if (!article || article.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.article.update({
    where: { id },
    data: {
      ...(body.title  !== undefined && { title:  body.title }),
      ...(body.url    !== undefined && { url:    body.url }),
      ...(body.source !== undefined && { source: body.source }),
      ...(body.notes  !== undefined && { notes:  body.notes }),
      ...(body.read   !== undefined && { read:   body.read }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article || article.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.article.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
