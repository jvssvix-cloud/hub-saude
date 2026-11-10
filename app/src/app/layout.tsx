import type { Metadata, Viewport } from "next";
import { Geist_Mono, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hub de Saúde",
  description: "Seu histórico de saúde num lugar só: exames de anos e dados do relógio, para você e para o seu médico.",
};

export const viewport: Viewport = { themeColor: "#faf8f3" };

/** Raiz: só fontes e a faixa de identidade. Cada área (paciente, médico) tem o próprio layout. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <div aria-hidden className="flex h-1">
          <div className="flex-1 bg-rivio-1" />
          <div className="flex-1 bg-rivio-2" />
          <div className="flex-1 bg-rivio-3" />
          <div className="flex-1 bg-rivio-4" />
        </div>
        {children}
      </body>
    </html>
  );
}
