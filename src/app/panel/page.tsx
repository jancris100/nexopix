import type { Metadata } from "next";
import PanelApp from "../../components/panel/PanelApp";
import { loadPanel } from "../../lib/panel";
import "./panel.css";

export const metadata: Metadata = { title: "Panel de Nexopix" };
export const dynamic = "force-dynamic";

export default async function PanelPage() {
  return <PanelApp initial={await loadPanel()} />;
}
