import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const articles = await prisma.article.findMany({
    where: { userId: session.user.id },
    orderBy: [{ read: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(articles);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.url?.trim()) return NextResponse.json({ error: "URL is required" }, { status: 400 });

  // Derive a sensible source/title from the URL when not provided
  let source = body.source?.trim() ?? "";
  if (!source) {
    try { source = new URL(body.url).hostname.replace(/^www\./, ""); } catch { source = ""; }
  }

  const article = await prisma.article.create({
    data: {
      userId: session.user.id,
      title: (body.title?.trim() || body.url.trim()),
      url: body.url.trim(),
      source,
      notes: body.notes ?? "",
    },
  });
  return NextResponse.json(article, { status: 201 });
}
