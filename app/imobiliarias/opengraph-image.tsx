import { ImageResponse } from "next/og";

export const alt = "RevFlow para Imobiliárias";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "68px", background: "linear-gradient(135deg, #fffcf4, #fff0bd)", color: "#172033" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ width: "58px", height: "58px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "16px", background: "#d88f0d", color: "white", fontSize: "30px" }}>↗</div>
        <span style={{ fontSize: "34px", fontWeight: 700 }}>RevFlow</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ color: "#a96705", fontSize: "23px", letterSpacing: "4px" }}>PARA IMOBILIÁRIAS</span>
        <span style={{ marginTop: "20px", fontSize: "64px", fontWeight: 700, lineHeight: 1.05 }}>Cada lead merece virar uma visita.</span>
      </div>
      <span style={{ color: "#626d7e", fontSize: "24px" }}>Leads, imóveis, visitas e negociações em um único fluxo.</span>
    </div>,
    size,
  );
}
