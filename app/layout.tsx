import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartSwap Agent",
  description: "Cost-aware cross-chain swap planning agent"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
