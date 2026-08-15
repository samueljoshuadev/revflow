import { ImageResponse } from "next/og";

export const alt = "RevFlow para Agências";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "68px", background: "linear-gradient(135deg, #f8f7ff, #e8e3ff)", color: "#172033" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ width: "58px", height: "58px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "16px", background: "#6d59e6", color: "white", fontSize: "30px" }}>↗</div>
        <span style={{ fontSize: "34px", fontWeight: 700 }}>RevFlow</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ color: "#6756e4", fontSize: "23px", letterSpacing: "4px" }}>PARA AGÊNCIAS</span>
        <span style={{ marginTop: "20px", fontSize: "62px", fontWeight: 700, lineHeight: 1.05 }}>Cada oportunidade em um processo comercial claro.</span>
      </div>
      <span style={{ color: "#59657a", fontSize: "24px" }}>Leads, propostas, agenda e follow-ups.</span>
    </div>,
    size,
  );
}
