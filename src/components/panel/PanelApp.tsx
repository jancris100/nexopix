"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { addPublication, advance, decide, toggleAccount, toggleAgent, toggleItem } from "../../app/panel/actions";
import { addDays } from "../../lib/dates";
import type { Snapshot } from "../../lib/panel";
import { FORMATS, type Format } from "../../lib/portero";

type View = "home" | "week" | "pipe" | "agents" | "nets";
type Pipeline = "reels" | "posts" | "ads";

const SCENES = [
  { src: "/escenas/volcan.png", alt: "Volcán al amanecer en pixel art" },
  { src: "/escenas/rio.png", alt: "Río y catarata en la selva en pixel art" },
  { src: "/escenas/cabana.png", alt: "Cabaña de noche con luciérnagas en pixel art" },
  { src: "/escenas/playa.png", alt: "Playa al atardecer con palmeras en pixel art" },
];
const SHORT_DAYS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const LONG_DAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"];
const STAGES = ["Idea", "Producción", "Revisión", "Programado", "Publicado"];
const REVIEW = 2;
const PIPELINES: { id: Pipeline; label: string; route: string }[] = [
  { id: "reels", label: "Reels", route: "Instagram Reels, luego Facebook si aplica" },
  { id: "posts", label: "Publicaciones", route: "feed o historias de la cuenta elegida" },
  { id: "ads", label: "Meta Ads", route: "tu revisión, luego campaña en Meta Ads" },
];
const VIEWS: Record<Exclude<View, "home">, { scene: number; kicker: string; title: string }> = {
  week: { scene: 0, kicker: "Planificación", title: "Tu semana" },
  pipe: { scene: 1, kicker: "De la idea a su destino", title: "Pipelines" },
  agents: { scene: 2, kicker: "Tu equipo de contenido", title: "Agentes" },
  nets: { scene: 3, kicker: "Tus cuentas de Meta", title: "Redes" },
};
const CRUMBS: Record<View, string> = { home: "Inicio", week: "Semana", pipe: "Pipelines", agents: "Agentes", nets: "Redes" };
const NAV: { id: View; label: string; icon: string }[] = [
  { id: "home", label: "Inicio", icon: "M4 11l8-7 8 7v9h-5v-6H9v6H4z" },
  { id: "week", label: "Semana", icon: "M6 5h12a3 3 0 013 3v10a3 3 0 01-3 3H6a3 3 0 01-3-3V8a3 3 0 013-3zM3 10h18M8 3v4M16 3v4" },
  { id: "pipe", label: "Pipelines", icon: "M6 4v16M6 12h6a6 6 0 006-6V4M6 12h6a6 6 0 016 6v2" },
  { id: "agents", label: "Agentes", icon: "M8 8h8a4 4 0 014 4v4a4 4 0 01-4 4H8a4 4 0 01-4-4v-4a4 4 0 014-4zM12 8V4M9.5 13v1.5M14.5 13v1.5" },
  { id: "nets", label: "Redes", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c.8-4 3.8-6 8-6s7.2 2 8 6" },
];

const dayNumber = (date: string) => Number(date.slice(8));
const formatLabel = (format: string) => FORMATS[format as Format]?.label ?? format;

function Scene({ index, alt = "", priority = false }: { index: number; alt?: string; priority?: boolean }) {
  const scene = SCENES[index % SCENES.length];
  return <Image className="np-px" src={scene.src} alt={alt} fill sizes="(max-width: 820px) 100vw, 70vw" priority={priority} unoptimized />;
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className={`np-pill${on ? " is-on" : ""}`} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  if (!now) return <p className="np-clock" aria-hidden="true">--:--</p>;
  const weekday = LONG_DAYS[(now.getDay() + 6) % 7];
  return (
    <>
      <p className="np-clock">{`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`}</p>
      <p className="np-date np-wide">{`${weekday[0].toUpperCase()}${weekday.slice(1)}, ${now.getDate()} de ${MONTHS[now.getMonth()]}`}</p>
    </>
  );
}

export default function PanelApp({ initial }: { initial: Snapshot }) {
  const [snap, setSnap] = useState(initial);
  const [view, setView] = useState<View>("home");
  const [slide, setSlide] = useState(0);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(snap.weekStart, index));
  const [day, setDay] = useState(snap.today);
  const [filter, setFilter] = useState("all");
  const [pipe, setPipe] = useState<Pipeline>("reels");
  const [stage, setStage] = useState(1);
  const [sheet, setSheet] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const run = (action: () => Promise<Snapshot>) =>
    start(async () => {
      try {
        setFailure(null);
        setSnap(await action());
      } catch {
        setFailure("No se pudo guardar. Inténtalo de nuevo.");
      }
    });

  const accountOf = (id: string) => snap.accounts.find((account) => account.id === id);
  const destination = (piece: Snapshot["pieces"][number]) => {
    const handle = accountOf(piece.accountId)?.handle ?? "";
    return piece.pipeline === "ads" ? `Meta Ads de ${accountOf(piece.accountId)?.brand}` : `${piece.pipeline === "reels" ? "Reels" : "Feed"} de ${handle}`;
  };
  const pendingToday = snap.agenda.filter((item) => item.scheduledOn === snap.today && !item.done).length;
  const decisions = snap.approvals.length;
  const running = snap.pieces.filter((piece) => piece.stage < 4).length;

  const slides = [
    { view: "week" as const, title: "Tu semana", tag: `${pendingToday} para hoy` },
    { view: "pipe" as const, title: "Pipelines", tag: `${running} en marcha` },
    { view: "agents" as const, title: "Agentes", tag: `${decisions} esperan` },
    { view: "nets" as const, title: "Redes", tag: `${snap.accounts.length} cuentas` },
  ];
  const previous = (slide + slides.length - 1) % slides.length;
  const next = (slide + 1) % slides.length;
  const banner = view === "home" ? null : VIEWS[view];
  const badge = (id: View) => (id === "week" ? pendingToday : id === "agents" ? decisions : 0);

  return (
    <div className={`np np--${view}`}>
      <header className="np-head np-pad">
        <div className="np-head__row">
          <p className="np-crumb">
            <Link href="/">Nexopix</Link> <span>/</span> {CRUMBS[view]}
          </p>
          {snap.isTest && <p className="np-test">Datos de prueba</p>}
          <Clock />
          <button type="button" className="np-ghost" onClick={() => setSheet(true)}>Nueva publicación</button>
        </div>
        <div className="np-strip np-scroll">
          <div className="np-strip__row">
            <div className="np-week">
              {weekDays.map((date, index) => (
                <button
                  key={date}
                  type="button"
                  className={`np-day${day === date ? " is-on" : ""}`}
                  aria-label={`${LONG_DAYS[index]} ${dayNumber(date)}${date === snap.today ? ", hoy" : ""}`}
                  onClick={() => { setDay(date); setView("week"); }}
                >
                  <span>{`${SHORT_DAYS[index]} ${dayNumber(date)}`}</span>
                  <i className={snap.agenda.some((item) => item.scheduledOn === date) ? "has" : ""} />
                </button>
              ))}
            </div>
            <button type="button" className="np-link" onClick={() => setView("agents")}>
              <strong>Te toca decidir</strong>
              <small>{decisions === 1 ? "1 cosa" : `${decisions} cosas`}</small>
            </button>
            <button type="button" className="np-link" onClick={() => { setDay(snap.today); setView("week"); }}>
              <strong>Hoy</strong>
              <small>{pendingToday} por hacer</small>
            </button>
          </div>
        </div>
      </header>

      <main className="np-main np-pad">
        {failure && <p className="np-alert" role="alert">{failure}</p>}

        {view === "home" && (
          <section aria-label="Secciones" className="np-home">
            <div className="np-stage">
              <button type="button" className="np-peek np-peek--left" aria-label={`Ver ${slides[previous].title}`} onClick={() => setSlide(previous)}>
                <Scene index={previous} />
              </button>
              <article className="np-slide">
                <Scene index={slide} alt={SCENES[slide].alt} priority />
                <p className="np-slide__tag">{slides[slide].tag}</p>
                <button type="button" className="np-arrow np-arrow--left" aria-label="Anterior" onClick={() => setSlide(previous)}>‹</button>
                <button type="button" className="np-arrow np-arrow--right" aria-label="Siguiente" onClick={() => setSlide(next)}>›</button>
                <div className="np-slide__foot">
                  <h1>{slides[slide].title}</h1>
                  <button type="button" className="np-primary" onClick={() => setView(slides[slide].view)}>Entrar →</button>
                </div>
              </article>
              <button type="button" className="np-peek np-peek--right" aria-label={`Ver ${slides[next].title}`} onClick={() => setSlide(next)}>
                <Scene index={next} />
              </button>
            </div>
            <div className="np-dots">
              {slides.map((item, index) => (
                <button key={item.view} type="button" aria-label={`Ir a ${item.title}`} onClick={() => setSlide(index)}>
                  <span className={index === slide ? "is-on" : ""} />
                </button>
              ))}
            </div>
          </section>
        )}

        {banner && (
          <div className="np-inner">
            <div className="np-banner">
              <Scene index={banner.scene} />
              <div className="np-banner__text">
                <p>{banner.kicker}</p>
                <h1>{banner.title}</h1>
              </div>
            </div>

            {view === "week" && (
              <div className="np-stack">
                <div className="np-pills">
                  <Pill on={filter === "all"} onClick={() => setFilter("all")}>Todas</Pill>
                  {snap.accounts.filter((account) => account.network === "instagram").map((account) => (
                    <Pill key={account.id} on={filter === account.id} onClick={() => setFilter(account.id)}>{account.brand}</Pill>
                  ))}
                </div>
                <div className="np-scroll">
                  <div className="np-board">
                    {weekDays.map((date, index) => (
                      <section key={date} aria-label={`${SHORT_DAYS[index]} ${dayNumber(date)}`} className={`np-col${day === date ? " is-on" : ""}`}>
                        <h2 className={date === snap.today ? "is-today" : ""}>{`${SHORT_DAYS[index]} ${dayNumber(date)}`}</h2>
                        {snap.agenda
                          .filter((item) => item.scheduledOn === date && (filter === "all" || item.accountId === filter))
                          .map((item) => (
                            <button key={item.id} type="button" className={`np-item${item.done ? " is-done" : ""}`} aria-pressed={item.done} disabled={busy} onClick={() => run(() => toggleItem(item.id))}>
                              <small>{`${item.time} · ${formatLabel(item.format)}`}</small>
                              <strong>{item.title}</strong>
                              <small>{`${accountOf(item.accountId)?.handle} · ${item.done ? "Lista" : "Pendiente"}`}</small>
                            </button>
                          ))}
                      </section>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {view === "pipe" && (
              <div className="np-stack">
                <div className="np-pills">
                  {PIPELINES.map((item) => (
                    <Pill key={item.id} on={pipe === item.id} onClick={() => setPipe(item.id)}>
                      {`${item.label} · ${snap.pieces.filter((piece) => piece.pipeline === item.id).length}`}
                    </Pill>
                  ))}
                </div>
                <div className="np-scroll">
                  <div className="np-funnel">
                    {STAGES.map((name, index) => (
                      <button key={name} type="button" className={`np-step${stage === index ? " is-on" : ""}`} aria-pressed={stage === index} onClick={() => setStage(index)}>
                        <small>{name.toUpperCase()}</small>
                        <strong>{snap.pieces.filter((piece) => piece.pipeline === pipe && piece.stage === index).length}</strong>
                      </button>
                    ))}
                  </div>
                </div>
                <p className="np-note">Ruta: {PIPELINES.find((item) => item.id === pipe)?.route}</p>
                <div className="np-gallery">
                  {snap.pieces.filter((piece) => piece.pipeline === pipe && piece.stage === stage).map((piece) => (
                    <article key={piece.id} className="np-card">
                      <div className="np-card__img">
                        <Scene index={piece.scene} />
                        <p>{formatLabel(piece.format)}</p>
                      </div>
                      <div className="np-card__body">
                        <h2>{piece.title}</h2>
                        <p>Va a {destination(piece)}</p>
                        {piece.stage === REVIEW ? (
                          <button type="button" className="np-ghost" onClick={() => setView("agents")}>Esperando tu decisión</button>
                        ) : piece.stage < STAGES.length - 1 ? (
                          <button type="button" className="np-ghost" disabled={busy} onClick={() => run(() => advance(piece.id))}>
                            Pasar a {STAGES[piece.stage + 1].toLowerCase()}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
                {!snap.pieces.some((piece) => piece.pipeline === pipe && piece.stage === stage) && <p className="np-empty">Nada en esta etapa.</p>}
              </div>
            )}

            {view === "agents" && (
              <div className="np-stack">
                <section aria-label="Te toca decidir" className="np-stack np-stack--tight">
                  <h2 className="np-title">Te toca decidir</h2>
                  {snap.approvals.map((approval) => {
                    const piece = snap.pieces.find((item) => item.id === approval.pieceId);
                    if (!piece) return null;
                    return (
                      <div key={approval.id} className="np-decide">
                        <div>
                          <small>{approval.agent} pide tu aprobación</small>
                          <p>{`${piece.pipeline === "ads" ? "Lanzar" : "Programar"} ${piece.title} · ${destination(piece)}`}</p>
                        </div>
                        <button type="button" className="np-ghost" disabled={busy} onClick={() => run(() => decide(approval.id, false))}>Rechazar</button>
                        <button type="button" className="np-primary" disabled={busy} onClick={() => run(() => decide(approval.id, true))}>Aprobar</button>
                      </div>
                    );
                  })}
                  {decisions === 0 && <p className="np-empty">Todo decidido por ahora. Lo aprobado ya aparece en tu semana y en Pipelines.</p>}
                </section>
                <section aria-label="Equipo" className="np-grid">
                  {snap.agents.map((agent) => (
                    <div key={agent.id} className="np-agent">
                      <div>
                        <h2>{agent.name}</h2>
                        <p>{agent.job}</p>
                      </div>
                      <button type="button" role="switch" aria-checked={agent.active} aria-label={`${agent.name}: ${agent.active ? "activo" : "apagado"}`} className={`np-switch${agent.active ? " is-on" : ""}`} disabled={busy} onClick={() => run(() => toggleAgent(agent.id))}>
                        <span><i /></span>
                      </button>
                    </div>
                  ))}
                </section>
                <p className="np-note">Ningún agente publica ni gasta en anuncios sin tu aprobación.</p>
              </div>
            )}

            {view === "nets" && (
              <div className="np-stack">
                <div className="np-grid">
                  {snap.accounts.map((account) => (
                    <article key={account.id} className="np-card">
                      <div className="np-card__img np-card__img--short"><Scene index={account.scene} /></div>
                      <div className="np-card__body">
                        <div>
                          <h2>{account.handle}</h2>
                          <p>{`${account.network === "instagram" ? "Instagram" : "Facebook"} · ${account.brand}`}</p>
                        </div>
                        <dl className="np-stats">
                          <div><dd>—</dd><dt>Seguidores</dt></div>
                          <div><dd>—</dd><dt>Alcance</dt></div>
                          <div><dd>{snap.agenda.filter((item) => item.accountId === account.id).length}</dd><dt>Esta semana</dt></div>
                        </dl>
                        <button type="button" className={account.linked ? "np-ghost" : "np-primary"} disabled={busy} onClick={() => run(() => toggleAccount(account.id))}>
                          {account.linked ? "Conectada en la demo" : "Conectar con Meta"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                <p className="np-note">Seguidores y alcance aparecen al conectar cada cuenta con Meta.</p>
              </div>
            )}
          </div>
        )}
      </main>

      <div className="np-dockwrap">
        <nav className="np-dock" aria-label="Principal">
          {NAV.map((item) => (
            <button key={item.id} type="button" className={view === item.id ? "is-on" : ""} aria-current={view === item.id ? "page" : undefined} aria-label={`${item.label}${badge(item.id) > 0 ? `, ${badge(item.id)} pendientes` : ""}`} onClick={() => setView(item.id)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={item.icon} /></svg>
              <span>{item.label}</span>
              {badge(item.id) > 0 && <b>{badge(item.id)}</b>}
            </button>
          ))}
        </nav>
      </div>

      {sheet && (
        <NewPublication
          snap={snap}
          date={day}
          dayLabel={`${LONG_DAYS[Math.max(weekDays.indexOf(day), 0)]} ${dayNumber(day)}`}
          onClose={() => setSheet(false)}
          onSaved={(next) => { setSnap(next); setSheet(false); setView("week"); }}
        />
      )}
    </div>
  );
}

function NewPublication({ snap, date, dayLabel, onClose, onSaved }: { snap: Snapshot; date: string; dayLabel: string; onClose: () => void; onSaved: (snapshot: Snapshot) => void }) {
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<Format>("reel");
  const [accountId, setAccountId] = useState(snap.accounts[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const account = snap.accounts.find((item) => item.id === accountId);
    start(async () => {
      try {
        const result = await addPublication({ title, format, accountId, network: account?.network ?? "", date });
        if (result.snapshot) onSaved(result.snapshot);
        else setError(result.error ?? "No se pudo guardar.");
      } catch {
        setError("No se pudo guardar. Inténtalo de nuevo.");
      }
    });
  };

  return (
    <div className="np-scrim">
      <form role="dialog" aria-modal="true" aria-label="Nueva publicación" className="np-sheet" onSubmit={submit}>
        <div className="np-sheet__head">
          <h2>Nueva publicación</h2>
          <button type="button" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        <label>
          Título
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="¿Qué vas a publicar?" maxLength={120} autoFocus />
        </label>
        <fieldset>
          <legend>Formato</legend>
          <div className="np-pills">
            {(Object.keys(FORMATS) as Format[]).map((key) => <Pill key={key} on={format === key} onClick={() => setFormat(key)}>{FORMATS[key].label}</Pill>)}
          </div>
        </fieldset>
        <fieldset>
          <legend>Cuenta</legend>
          <div className="np-pills">
            {snap.accounts.map((account) => <Pill key={account.id} on={accountId === account.id} onClick={() => setAccountId(account.id)}>{account.handle}</Pill>)}
          </div>
        </fieldset>
        {error && <p className="np-alert" role="alert">{error}</p>}
        <button type="submit" className="np-primary np-primary--big" disabled={saving}>Agregar al {dayLabel}</button>
      </form>
    </div>
  );
}
