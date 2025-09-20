import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

/**
 * Root layout for the App Router.
 * - Applies dark theme and mobile-first centered container.
 * - Renders a persistent Header with auth-aware links.
 */
export const metadata: Metadata = {
  title: "PollSite",
  description: "Lightweight polls with realtime updates",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark">
      <body className="bg-gray-950 text-gray-100 antialiased">
        <Header />
        <main className="mx-auto w-full max-w-md px-4 pb-10 pt-4">
          {children}
        </main>
      </body>
    </html>
  );
}