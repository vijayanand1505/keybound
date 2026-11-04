import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://keybound-expeditions.vercel.app"),
  title: "KEYBOUND — Free typing games & practice",
  description:
    "Free typing games, story missions, and custom text practice. Improve your speed and accuracy, track your results, and play without an account.",
  applicationName: "KEYBOUND",
  openGraph: {
    title: "KEYBOUND — Free typing games & practice",
    description: "Play free typing games and practice with your own text.",
    type: "website",
    images: [
      {
        url: "/images/games/signal-siege.png",
        width: 1536,
        height: 1024,
        alt: "Signal Siege: a fighter above an ocean planet",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KEYBOUND — Free typing games & practice",
    description: "Play free typing games and practice with your own text.",
    images: ["/images/games/signal-siege.png"],
  },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
