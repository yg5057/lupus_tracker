import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lupus Tracker",
    short_name: "Lupus Tracker",
    description: "체온과 혈압을 기록하고 추세를 확인하세요",
    start_url: "/",
    display: "standalone",
    background_color: "#F9FAFB",
    theme_color: "#F9FAFB",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
