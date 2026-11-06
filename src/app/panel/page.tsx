import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import PanelApp from "../../components/panel/PanelApp";
import { loadPanel } from "../../lib/panel";
import "./panel.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", weight: ["500", "600", "700"] });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

export const metadata: Metadata = { title: "Panel · Nexopix" };
export const dynamic = "force-dynamic";

export default async function PanelPage() {
  const snapshot = await loadPanel();
  return (
    <div className={`${bricolage.variable} ${figtree.variable}`}>
      <PanelApp initial={snapshot} />
    </div>
  );
}
