import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        borderRadius: 32,
        background: "#304a3e",
      }}
    >
      {[14, 28, 22, 14].map((height, index) => (
        <span
          key={index}
          style={{
            width: 5,
            height,
            borderRadius: 4,
            background: "#fffdf8",
          }}
        />
      ))}
    </div>,
    size,
  );
}
