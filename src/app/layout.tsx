import type { Metadata, Viewport } from "next";
import "@/app/globals.css";

function siteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL
    ?? process.env.VERCEL_PROJECT_PRODUCTION_URL
    ?? process.env.VERCEL_URL
    ?? "ygoproxies.vercel.app";

  return url.startsWith("http") ? url : `https://${url}`;
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "YGO Proxies | Gerador de Proxies Yu-Gi-Oh!",
    template: "%s | YGO Proxies",
  },
  description: "Monte seu deck de Yu-Gi-Oh!, gere proxies das cartas em PDF e escolha entre download gratuito com qualidade inferior ou versao Full HD.",
  applicationName: "YGO Proxies",
  keywords: ["Yu-Gi-Oh!", "YGO Proxies", "proxies", "cartas", "PDF", "deck"],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "YGO Proxies | Gerador de Proxies Yu-Gi-Oh!",
    description: "Pesquise cartas, monte seu deck e gere um PDF pronto para baixar, com opcao gratuita ou Full HD.",
    url: "/",
    siteName: "YGO Proxies",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "YGO Proxies | Gerador de Proxies Yu-Gi-Oh!",
    description: "Monte seu deck e gere proxies de Yu-Gi-Oh! em PDF com opcao gratuita ou Full HD.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f7f4ec",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
