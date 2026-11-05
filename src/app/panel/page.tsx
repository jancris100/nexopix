import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import PipelineDemo from "@/components/PipelineDemo";

export const metadata: Metadata = { title: "Panel · Nexopix" };

export default function Panel() {
  return (
    <main>
      <header className="bar">
        <Link href="/" className="brand">
          <Image src="/logo.png" alt="" width={36} height={36} />
          <span>
            NEXO<b>PIX</b>
          </span>
        </Link>
        <span className="badge">Demostración · sin agentes reales ni publicaciones</span>
      </header>
      <PipelineDemo />
    </main>
  );
}
