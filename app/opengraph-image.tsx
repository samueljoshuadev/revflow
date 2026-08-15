import { ImageResponse } from "next/og";

export const alt = "RevFlow — operação comercial em movimento";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "68px",
        background: "linear-gradient(135deg, #172033 0%, #272056 58%, #7160ef 140%)",
        color: "white",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div
          style={{
            width: "58px",
            height: "58px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #9b8bff, #5b48d7)",
            fontSize: "30px",
          }}
        >
          ↗
        </div>
        <span style={{ fontSize: "34px", fontWeight: 700 }}>RevFlow</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ color: "#c8c0ff", fontSize: "23px", letterSpacing: "4px" }}>
          OPERAÇÃO COMERCIAL
        </span>
        <span style={{ marginTop: "20px", fontSize: "64px", fontWeight: 700, lineHeight: 1.05 }}>
          Menos oportunidades esquecidas.
        </span>
        <span style={{ marginTop: "10px", color: "#d9d5ff", fontSize: "43px" }}>
          Mais negócios em movimento.
        </span>
      </div>
      <span style={{ color: "#d6dbe6", fontSize: "24px" }}>
        Para agências e imobiliárias
      </span>
    </div>,
    size,
  );
}
