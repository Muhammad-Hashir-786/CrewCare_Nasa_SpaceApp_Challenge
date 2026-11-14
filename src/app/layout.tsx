import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crew Care — Astronaut Health Monitoring",
  description:
    "Crew Care is a simulated astronaut health assessment and monitoring platform. All data is fictional and for demonstration purposes only.",
  keywords: ["astronaut", "health", "monitoring", "space", "NASA", "hackathon"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
