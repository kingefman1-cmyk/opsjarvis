import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpsJarvis | AI operations desk",
  description: "Demo of a Claude-powered operations assistant: inbox triage, live API status and approved task execution.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
