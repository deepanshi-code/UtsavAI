import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import Link from "next/link";
import Nav from "@/components/Nav";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });

export const metadata: Metadata = {
  title: { default: "UtsavAI: AI planner for Indian celebrations", template: "%s · UtsavAI" },
  description:
    "Plan weddings, birthdays, festivals and community events with AI: a budget that adds up, a dated timeline, vendor checklists and ideas for your city and traditions.",
};

export const viewport: Viewport = { themeColor: "#08070d", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body>
        <ToastProvider>
          <Nav />
          <main id="main">{children}</main>
          <footer className="footer no-print">
            <div className="container row">
              <span>© {new Date().getFullYear()} UtsavAI · Built with Gemini</span>
              <span className="spacer" />
              <Link href="/plans" className="nav-link">My plans</Link>
              <Link href="/plan/new" className="nav-link">New plan</Link>
            </div>
            <div className="container small" style={{ marginTop: 8 }}>
              AI-generated plans are a starting point. Verify prices and availability with vendors before booking.
            </div>
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
