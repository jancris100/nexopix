import Link from "next/link";
import { Logo } from "../components/panel/Marks";
import { LanguageSwitch } from "../i18n/client";
import { getDictionary } from "../i18n/server";

export default async function Home() {
  const t = await getDictionary();
  const [gate, writer, human, publisher] = t.home.previewChain;
  return (
    <main className="site">
      <header className="wrap site__bar">
        <Link href="/" className="brand">
          <Logo size={30} />
          Nexopix
        </Link>
        <nav className="site__links">
          <LanguageSwitch />
          <Link href="/docs">{t.common.api}</Link>
          <Link href="/panel" className="btn btn--quiet">{t.common.openPanel}</Link>
        </nav>
      </header>

      <section className="wrap hero">
        <div>
          <h1>{t.home.headline}</h1>
          <p className="hero__lead">{t.home.lead}</p>
          <div className="hero__actions">
            <Link href="/panel" className="btn">{t.home.demo}</Link>
          </div>
        </div>
        <div className="preview" aria-label={t.home.previewLabel}>
          <p className="preview__chain">
            <span>{gate}</span><i /><span>{writer}</span><i /><span className="is-human">{human}</span><i /><span>{publisher}</span>
          </p>
          <div className="preview__piece">
            <strong>{t.home.previewTitle}</strong>
            <small>{t.home.previewMeta}</small>
          </div>
          <p className="preview__copy">{t.home.previewCopy}</p>
          <div className="preview__decide">
            <p>{t.home.previewWaiting}</p>
            <div><b>{t.team.reject}</b><b>{t.team.approve}</b></div>
          </div>
        </div>
      </section>

      <section className="wrap">
        <h2 className="section-title">{t.home.howItWorks}</h2>
        <ol className="steps">
          {t.home.steps.map((step) => (
            <li key={step.name} className={step.human ? "is-human" : undefined}>
              <strong>{step.name}</strong>
              <span>{step.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="wrap foot">
        <p>{t.home.footer}</p>
      </footer>
    </main>
  );
}
