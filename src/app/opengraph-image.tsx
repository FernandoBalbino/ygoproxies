import { ImageResponse } from "next/og";

export const alt = "YGO Proxies - Gerador de proxies de Yu-Gi-Oh!";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f7f4ec",
          color: "#17130f",
          padding: 64,
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ color: "#991b1b", fontSize: 30, fontWeight: 900, letterSpacing: 0 }}>
              Yu-Gi-Oh!
            </div>
            <div style={{ maxWidth: 760, fontSize: 92, fontWeight: 900, lineHeight: 0.92, letterSpacing: 0 }}>
              YGO Proxies
            </div>
          </div>
          <div
            style={{
              width: 132,
              height: 184,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "10px solid #17130f",
              background: "#b91c1c",
              color: "#ffffff",
              fontSize: 54,
              fontWeight: 900,
              boxShadow: "14px 14px 0 #d6cfc1",
            }}
          >
            PDF
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ maxWidth: 930, fontSize: 43, lineHeight: 1.18, fontWeight: 800 }}>
            Monte seu deck, gere proxies de cartas e baixe um PDF pronto para imprimir.
          </div>
          <div style={{ display: "flex", gap: 18, fontSize: 28, fontWeight: 800 }}>
            <span style={{ padding: "16px 22px", background: "#17130f", color: "#ffffff" }}>Busca de cartas</span>
            <span style={{ padding: "16px 22px", background: "#e5dfd1", color: "#17130f" }}>Deck principal e extra</span>
            <span style={{ padding: "16px 22px", background: "#e5dfd1", color: "#17130f" }}>PDF gratis ou Full HD</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
