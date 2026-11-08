import type { MetadataRoute } from "next";

/** Makes the panel installable on a phone: its own icon, full screen and the panel as the first screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/panel",
    name: "Nexopix",
    short_name: "Nexopix",
    description: "Tu equipo de agentes para redes sociales, con tu aprobación.",
    lang: "es",
    start_url: "/panel",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F5F6F3",
    theme_color: "#F5F6F3",
    categories: ["business", "productivity", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
