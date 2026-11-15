import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyPilot · AI Study Planner",
  description: "Create a practical study plan from courses, assignments, deadlines and available time.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="antialiased">{children}</body></html>;
}
