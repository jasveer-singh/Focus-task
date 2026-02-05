import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Focus Tasks",
  description: "Task list with clean, expandable notes."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
