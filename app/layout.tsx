import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Level UP Academy — Kindergarten to Grade 8, Addis Ababa",
  description: "Level UP Academy is a leading private school in Addis Ababa, Ethiopia, offering world-class education from Kindergarten through Grade 8.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
