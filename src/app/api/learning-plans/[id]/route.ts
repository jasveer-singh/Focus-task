import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const plan = await prisma.learningPlan.findUnique({ where: { id } });
  if (!plan || plan.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.learningPlan.update({
    where: { id },
    data: {
      ...(body.title    !== undefined && { title:    body.title }),
      ...(body.subtitle !== undefined && { subtitle: body.subtitle }),
      ...(body.phases   !== undefined && { phases:   body.phases }),
      ...(body.sections !== undefined && { sections: body.sections }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const plan = await prisma.learningPlan.findUnique({ where: { id } });
  if (!plan || plan.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.learningPlan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
