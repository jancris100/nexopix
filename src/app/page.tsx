import Image from "next/image";
import Link from "next/link";

const steps = [
  { name: "Entrada", text: "Llega una petición por API, WhatsApp o panel, con cuenta, red, formato y archivo." },
  { name: "Portero", text: "Revisa permisos, formato y contenido. Si no cumple, la rechaza y explica por qué." },
  { name: "Guion", text: "Escribe el texto y la descripción con el tono de cada marca." },
  { name: "Video", text: "Prepara la pieza para el formato de cada red." },
  { name: "Aprobás", text: "Una persona revisa y decide. Nada se publica sin ese paso.", human: true },
  { name: "Publicado", text: "Sale por API. Lo que no tiene API pasa a ser una tarea manual.", done: true },
];

export default function Home() {
  return (
    <main>
      <header className="bar">
        <Link href="/" className="brand">
          <Image src="/logo.png" alt="" width={36} height={36} />
          <span>
            NEXO<b>PIX</b>
          </span>
        </Link>
        <Link href="/panel" className="btn btn--ghost">
          Ver el panel
        </Link>
      </header>

      <section className="hero wrap">
        <p className="kicker">Middleware de agentes de IA</p>
        <h1>
          Entra una petición.
          <br />
          Sale una publicación.
          <br />
          <em>Una persona aprueba.</em>
        </h1>
        <p className="lead">
          Nexopix conecta tus sistemas con Instagram y Facebook por API. Los agentes validan, escriben y preparan cada
          pieza, y vos ves cada paso en un pipeline.
        </p>
        <div className="actions">
          <Link href="/panel" className="btn">
            Probar la demostración
          </Link>
        </div>
      </section>

      <section className="wrap">
        <h2>Cómo funciona</h2>
        <ol className="flow">
          {steps.map((s) => (
            <li key={s.name} className={s.human ? "is-human" : s.done ? "is-done" : ""}>
              <strong>{s.name}</strong>
              <span>{s.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="wrap foot">
        <p>Nexopix se conecta por API. INTENEXO es su primer cliente.</p>
      </footer>
    </main>
  );
}
