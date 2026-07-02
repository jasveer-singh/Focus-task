import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enrichUrl } from "@/lib/enrich";

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

  const url = body.url.trim();
  const enriched = await enrichUrl(url);

  const article = await prisma.article.create({
    data: {
      userId: session.user.id,
      // User-provided title wins; else the enriched title
      title: body.title?.trim() || enriched.title,
      url,
      source: enriched.source,
      notes: body.notes ?? "",
      space: body.space === "personal" ? "personal" : "professional",
      platform: enriched.platform,
      thumbnail: enriched.thumbnail,
      author: enriched.author,
      type: enriched.type,
    },
  });
  return NextResponse.json(article, { status: 201 });
}
