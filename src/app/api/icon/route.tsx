import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const dynamic = "force-static";

export async function GET(req: NextRequest) {
  const size = parseInt(req.nextUrl.searchParams.get("size") || "192", 10);
  const radius = Math.round(size * 0.2);
  const fontSize = Math.round(size * 0.6);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: "#cc785c",
          borderRadius: radius,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize,
          fontWeight: 700,
          fontFamily: "serif",
        }}
      >
        S
      </div>
    ),
    { width: size, height: size }
  );
}
