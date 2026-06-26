import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enrichUrl } from "@/lib/enrich";

// Token-authenticated capture endpoint used by the iOS Shortcut / share targets.
// Accepts { token, url, note? } and saves an enriched Article for that user.
// CORS-open so it can be called from a Shortcut.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  let body: { token?: string; url?: string; note?: string; title?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: CORS });
  }

  const token = body.token?.trim();
  const url = body.url?.trim();

  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401, headers: CORS });
  if (!url)   return NextResponse.json({ error: "Missing url" }, { status: 400, headers: CORS });

  const user = await prisma.user.findUnique({ where: { captureToken: token }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Invalid token" }, { status: 401, headers: CORS });

  const enriched = await enrichUrl(url);

  const article = await prisma.article.create({
    data: {
      userId: user.id,
      title: body.title?.trim() || enriched.title,
      url,
      source: enriched.source,
      notes: body.note?.trim() ?? "",
      platform: enriched.platform,
      thumbnail: enriched.thumbnail,
      author: enriched.author,
      type: enriched.type,
    },
  });

  return NextResponse.json(
    { ok: true, saved: { title: article.title, platform: article.platform } },
    { status: 201, headers: CORS }
  );
}
