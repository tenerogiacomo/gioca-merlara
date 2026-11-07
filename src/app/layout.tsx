import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gioca Merlara",
  description: "Prenotazione della piattaforma polivalente di Merlara",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
