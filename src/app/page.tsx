import Link from "next/link";
import { Logo } from "../components/panel/Marks";

const steps = [
  { name: "Entra una petición", text: "Por API, WhatsApp o el panel, con la cuenta, la red, el formato y el archivo." },
  { name: "El Portero la revisa", text: "Comprueba cuenta, formato y archivos con reglas fijas. Si algo no cumple, dice por qué." },
  { name: "El equipo la prepara", text: "Escribe con el tono de cada marca y deja la pieza lista para cada red." },
  { name: "Tú decides", text: "Nada se publica sin tu aprobación. Rechazar la devuelve a producción.", human: true },
  { name: "Sale publicada", text: "Por API en Instagram y Facebook. Lo que no tiene API pasa a ser una tarea." },
  { name: "Sabes qué funcionó", text: "Cada enlace lleva su marca y el resumen diario dice qué pieza trajo consultas." },
];

export default function Home() {
  return (
    <main className="site">
      <header className="wrap site__bar">
        <Link href="/" className="brand">
          <Logo size={30} />
          Nexopix
        </Link>
        <nav className="site__links"><Link href="/docs">API</Link><Link href="/panel" className="btn btn--quiet">Abrir el panel</Link></nav>
      </header>

      <section className="wrap hero">
        <div>
          <h1>Un equipo de agentes que publica por ti, con tu aprobación.</h1>
          <p className="hero__lead">
            Nexopix conecta tus sistemas con Instagram y Facebook. Los agentes revisan, escriben y preparan cada pieza;
            tú ves todo el recorrido y das el último sí.
          </p>
          <div className="hero__actions">
            <Link href="/panel" className="btn">Ver la demostración</Link>
          </div>
        </div>
        <div className="preview" aria-label="Ejemplo de una pieza esperando aprobación">
          <p className="preview__chain">
            <span>Portero</span><i /><span>Guionista</span><i /><span className="is-human">Tú</span><i /><span>Publicador</span>
          </p>
          <div className="preview__piece">
            <strong>Reel: factura desde el celular</strong>
            <small>Reel para @intenexo.cr, martes a las 10:00</small>
          </div>
          <p className="preview__copy">“Facturar ya no es tarea de fin de mes. Hazlo desde el celular, en dos minutos, conectado con Hacienda.”</p>
          <div className="preview__decide">
            <p>Esperando tu decisión</p>
            <div><b>Rechazar</b><b>Aprobar</b></div>
          </div>
        </div>
      </section>

      <section className="wrap">
        <h2 className="section-title">Cómo funciona</h2>
        <ol className="steps">
          {steps.map((step) => (
            <li key={step.name} className={step.human ? "is-human" : undefined}>
              <strong>{step.name}</strong>
              <span>{step.text}</span>
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
