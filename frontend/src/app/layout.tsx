import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Hangar — AI Wardrobe Manager",
  description:
    "Self-hosted AI wardrobe manager. Upload your clothes, get outfit suggestions based on today's weather.",
  keywords: ["wardrobe", "AI", "outfit", "fashion", "self-hosted"],
  openGraph: {
    title: "Hangar — AI Wardrobe Manager",
    description:
      "Self-hosted AI wardrobe manager. Upload your clothes, get outfit suggestions based on today's weather.",
    type: "website",
    siteName: "Hangar",
  },
  twitter: {
    card: "summary",
    title: "Hangar — AI Wardrobe Manager",
    description:
      "Self-hosted AI wardrobe manager. Upload your clothes, get outfit suggestions based on today's weather.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
