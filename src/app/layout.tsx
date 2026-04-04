import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Outfit } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Next Level Note",
  description: "A minimal, warm note-taking app",
  openGraph: {
    title: "Next Level Note",
    description: "A minimal, warm note-taking app",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Next Level Note - A minimal, warm note-taking app",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Next Level Note",
    description: "A minimal, warm note-taking app",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakartaSans.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <Toaster position="bottom-right" />
      </body>
      <Analytics />
    </html>
  );
}
