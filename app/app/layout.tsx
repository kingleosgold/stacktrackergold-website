import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stack Tracker Gold - Privacy-First Precious Metals Tracker",
  description: "Track your gold and silver portfolio privately. Your data stays on your device.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
