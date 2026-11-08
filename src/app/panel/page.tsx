import type { Metadata } from "next";
import PanelApp from "../../components/panel/PanelApp";
import { getDictionary } from "../../i18n/server";
import { loadPanel } from "../../lib/panel";
import "./panel.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).panel.meta };
}
export const dynamic = "force-dynamic";

export default async function PanelPage() {
  return <PanelApp initial={await loadPanel()} />;
}
