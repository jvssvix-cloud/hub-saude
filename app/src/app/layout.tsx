import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hub de Saúde",
  description: "Seu histórico de exames num lugar só, com cada número ligado ao laudo original.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#121416" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <header className="sticky top-0 z-10 border-b border-linha bg-fundo/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-marca text-sm text-cartao">
                +
              </span>
              Hub de Saúde
            </Link>
            <span className="rounded-full bg-marca-fundo px-2.5 py-1 text-xs text-marca">dados sintéticos</span>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 pb-16 pt-5">{children}</main>
      </body>
    </html>
  );
}
