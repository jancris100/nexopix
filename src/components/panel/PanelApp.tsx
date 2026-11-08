"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import { addAccount, addPublication, advance, decide, removeAccount, saveProfile, toggleAgent, toggleItem } from "../../app/panel/actions";
import { addDays } from "../../lib/dates";
import { morningSummary, trackedLink } from "../../lib/insights";
import type { Snapshot } from "../../lib/panel";
import { FORMATS, type Format } from "../../lib/portero";
import { AGENT_TONES, AgentMark, Logo, NavIcon } from "./Marks";

type View = "team" | "week" | "networks" | "results";
type Piece = Snapshot["pieces"][number];
type Account = Snapshot["accounts"][number];
type Agent = Snapshot["agents"][number];

const STATIONS = [
  { stage: 0, name: "Idea", agent: "estratega", verb: "Trabaja" },
  { stage: 1, name: "Producción", agent: "guionista", verb: "Escribe" },
  { stage: 2, name: "Revisión", agent: "persona", verb: "" },
  { stage: 3, name: "Programado", agent: "programador", verb: "Agenda" },
  { stage: 4, name: "Publicado", agent: "analista", verb: "Mide" },
];
const REVIEW = 2;
const LAST_STAGE = 4;
const TABS: { id: View; label: string; title: string }[] = [
  { id: "team", label: "Equipo", title: "Tu equipo" },
  { id: "week", label: "Semana", title: "Tu semana" },
  { id: "networks", label: "Redes", title: "Tus redes" },
  { id: "results", label: "Resultados", title: "Resultados" },
];
const PROFILE_FIELDS: { key: "voice" | "offer" | "audience" | "neverPromise" | "businessInfo"; label: string }[] = [
  { key: "voice", label: "Cómo habla la marca" },
  { key: "offer", label: "Qué vende" },
  { key: "audience", label: "A quién le habla" },
  { key: "neverPromise", label: "Qué nunca promete" },
  { key: "businessInfo", label: "Información del negocio" },
];
const LONG_DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const dayNumber = (date: string) => Number(date.slice(8));
const formatLabel = (format: string) => FORMATS[format as Format]?.label ?? format;
const pieces = (count: number) => (count === 1 ? "1 pieza" : `${count} piezas`);

/** Moves the screen from one state to the next: a piece travels to its new place instead of jumping there. */
function animate(update: () => void, kind: "move" | "page" = "move") {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || still) {
    update();
    return;
  }
  document.documentElement.dataset.transition = kind;
  document.startViewTransition(() => flushSync(update)).finished.finally(() => {
    delete document.documentElement.dataset.transition;
  });
}

export default function PanelApp({ initial }: { initial: Snapshot }) {
  const [snap, setSnap] = useState(initial);
  const [view, setView] = useState<View>("team");

  // Back from Instagram: open the networks screen, where the result of the connection is shown.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("red")) setView("networks");
  }, []);
  const [day, setDay] = useState(snap.today);
  const [sheet, setSheet] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const run = (action: () => Promise<Snapshot>) =>
    start(async () => {
      try {
        setFailure(null);
        const next = await action();
        animate(() => setSnap(next));
      } catch {
        setFailure("No se guardó el cambio. Revisa la conexión y vuelve a intentarlo.");
      }
    });

  const accountOf = (id: string) => snap.accounts.find((account) => account.id === id);
  const decisions = snap.approvals.length;

  return (
    <div className="np">
      <nav aria-label="Principal" className="np-rail">
        <Link href="/" className="np-rail__logo" aria-label="Nexopix, ir a la portada">
          <Logo size={40} />
        </Link>
        {TABS.map((tab) => (
          <button key={tab.id} type="button" className={view === tab.id ? "is-on" : ""} aria-current={view === tab.id ? "page" : undefined} onClick={() => view !== tab.id && animate(() => setView(tab.id), "page")}>
            <NavIcon name={tab.id} />
            <span>{tab.label}</span>
            {tab.id === "team" && decisions > 0 && <b aria-label={`${decisions} por aprobar`}>{decisions}</b>}
          </button>
        ))}
      </nav>

      <div className="np-page">
        <header className="np-top">
          <h1>{TABS.find((tab) => tab.id === view)?.title}</h1>
          {snap.isTest && <p className="np-test">Base temporal</p>}
          <button type="button" className="np-btn np-btn--go" onClick={() => setSheet(true)}>Nueva petición</button>
        </header>

        {failure && <p className="np-alert" role="alert">{failure}</p>}

        {view === "team" && <Team snap={snap} busy={busy} accountOf={accountOf} onAdvance={(id) => run(() => advance(id))} onDecide={(id, approved) => run(() => decide(id, approved))} onToggleAgent={(id) => run(() => toggleAgent(id))} />}

        {view === "week" && (
          <section aria-label="Semana" className="np-rows">
            {Array.from({ length: 7 }, (_, index) => addDays(snap.weekStart, index)).map((date, index) => {
              const items = snap.agenda.filter((item) => item.scheduledOn === date);
              return (
                <article key={date} className={`day${date === snap.today ? " is-today" : ""}`}>
                  <button type="button" className={`day__date${date === day ? " is-picked" : ""}`} aria-pressed={date === day} onClick={() => setDay(date)}>
                    <strong>{dayNumber(date)}</strong>
                    <span>{LONG_DAYS[index]}</span>
                  </button>
                  <div className="day__items">
                    {items.length === 0 && <p className="np-note">Sin publicaciones</p>}
                    {items.map((item) => (
                      <button key={item.id} type="button" className={`slot${item.done ? " is-done" : ""}`} aria-pressed={item.done} disabled={busy} onClick={() => run(() => toggleItem(item.id))}>
                        <strong>{item.title}</strong>
                        <small>{`${item.time}, ${formatLabel(item.format)} en ${accountOf(item.accountId)?.handle}`}</small>
                      </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {view === "networks" && <Networks snap={snap} busy={busy} onRemove={(id) => run(() => removeAccount(id))} onSaved={(next) => animate(() => setSnap(next))} />}

        {view === "results" && <Results snap={snap} accountOf={accountOf} />}
      </div>

      {sheet && (
        <NewRequest
          snap={snap}
          date={day}
          onClose={() => setSheet(false)}
          onSaved={(next) => {
            setSheet(false);
            animate(() => setSnap(next));
          }}
        />
      )}
    </div>
  );
}

/** The team in one line: each agent at its station, the person among them, with what each one holds. */
function Lineup({ snap, focus, onFocus }: { snap: Snapshot; focus: string | null; onFocus: (id: string | null) => void }) {
  const moving = snap.pieces.filter((piece) => piece.stage < LAST_STAGE).length;
  const crew = [
    { id: "enrutador", name: "Enrutador", stage: "Entrada", count: moving, line: moving === 0 ? "Sin trabajo" : `Reparte ${pieces(moving)}` },
    ...STATIONS.map((station) => {
      const count = snap.pieces.filter((piece) => piece.stage === station.stage).length;
      const human = station.agent === "persona";
      return {
        id: station.agent,
        name: human ? "Tú" : snap.agents.find((agent) => agent.id === station.agent)?.name ?? station.agent,
        stage: station.name,
        count,
        line: human ? (count === 0 ? "Nada por aprobar" : `${count} por aprobar`) : count === 0 ? "Sin trabajo" : `${station.verb} ${pieces(count)}`,
      };
    }),
  ];
  return (
    <section aria-label="Agentes" className="lineup">
      <span className="lineup__flow" aria-hidden="true" />
      {crew.map((member) => {
        const agent = snap.agents.find((item) => item.id === member.id);
        const off = agent ? !agent.active : false;
        return (
          <button
            key={member.id}
            type="button"
            className={`station${member.id === "persona" ? " station--human" : ""}${off ? " is-off" : member.count > 0 ? " is-busy" : ""}${focus === member.id ? " is-on" : ""}`}
            aria-pressed={focus === member.id}
            style={{ "--tone": AGENT_TONES[member.id]?.strong } as CSSProperties}
            onClick={() => onFocus(focus === member.id ? null : member.id)}
          >
            <span className="station__mark">
              <AgentMark agent={member.id} size={52} />
              {!off && member.count > 0 && <b>{member.count}</b>}
            </span>
            <strong>{member.name}</strong>
            <small>{off ? "Apagado" : member.line}</small>
            <span className="station__stage">{member.stage}</span>
          </button>
        );
      })}
    </section>
  );
}

function Team({ snap, busy, accountOf, onAdvance, onDecide, onToggleAgent }: { snap: Snapshot; busy: boolean; accountOf: (id: string) => Account | undefined; onAdvance: (id: number) => void; onDecide: (id: number, approved: boolean) => void; onToggleAgent: (id: string) => void }) {
  const [focus, setFocus] = useState<string | null>(null);
  const agentOf = (id: string) => snap.agents.find((agent) => agent.id === id);
  const focusAgent: Agent | undefined = focus ? agentOf(focus) : undefined;
  const station = STATIONS.find((item) => item.agent === focus);
  const shown = station ? snap.pieces.filter((piece) => piece.stage === station.stage) : snap.pieces;

  const groups = [
    { id: "decide", title: "Te toca decidir", items: shown.filter((piece) => piece.stage === REVIEW) },
    { id: "moving", title: "En marcha", items: shown.filter((piece) => piece.stage !== REVIEW && piece.stage < LAST_STAGE) },
    { id: "done", title: "Publicadas", items: shown.filter((piece) => piece.stage === LAST_STAGE) },
  ];

  const row = (piece: Piece) => {
    const approval = snap.approvals.find((item) => item.pieceId === piece.id);
    const place = STATIONS[piece.stage];
    const agent = agentOf(place.agent);
    return (
      <article key={piece.id} className={`piece${piece.stage === REVIEW ? " piece--human" : ""}`} style={{ viewTransitionName: `piece-${piece.id}` }}>
        <AgentMark agent={place.agent} size={40} />
        <div className="piece__text">
          <strong>{piece.title}</strong>
          <small>{`${formatLabel(piece.format)} en ${accountOf(piece.accountId)?.handle}`}</small>
        </div>
        <div className="piece__track" aria-label={`Etapa: ${place.name}`}>
          <span className="piece__dots" aria-hidden="true">
            {STATIONS.map((item) => <i key={item.stage} className={item.stage < piece.stage ? "is-past" : item.stage === piece.stage ? "is-now" : ""} />)}
          </span>
          <small>{place.name}</small>
        </div>
        <div className="piece__act">
          {piece.stage === REVIEW && approval ? (
            <>
              <button type="button" className="np-btn" disabled={busy} onClick={() => onDecide(approval.id, false)}>Rechazar</button>
              <button type="button" className="np-btn np-btn--human" disabled={busy} onClick={() => onDecide(approval.id, true)}>Aprobar</button>
            </>
          ) : piece.stage < LAST_STAGE ? (
            <button type="button" className="np-btn" disabled={busy || agent?.active === false} onClick={() => onAdvance(piece.id)}>
              {agent?.active === false ? `${agent.name} está apagado` : `Pasar a ${STATIONS[piece.stage + 1].name.toLowerCase()}`}
            </button>
          ) : (
            <span className="piece__done">Publicada</span>
          )}
        </div>
      </article>
    );
  };

  return (
    <>
      <Lineup snap={snap} focus={focus} onFocus={setFocus} />
      {focusAgent && (
        <div className="focus">
          <p><strong>{focusAgent.name}.</strong> {focusAgent.job}.</p>
          <button type="button" role="switch" aria-checked={focusAgent.active} className={`np-switch${focusAgent.active ? " is-on" : ""}`} disabled={busy} onClick={() => onToggleAgent(focusAgent.id)}>
            <span><i /></span>
            {focusAgent.active ? "Encendido" : "Apagado"}
          </button>
        </div>
      )}
      <div className="np-rows">
        {groups.filter((group) => group.items.length > 0).map((group) => (
          <section key={group.id} aria-label={group.title} className="group">
            <h2>{group.title} <small>{group.items.length}</small></h2>
            {group.items.map(row)}
          </section>
        ))}
        {shown.length === 0 && <p className="np-note">{focus ? "Este agente no tiene piezas ahora." : "Todavía no hay piezas. Agrega una red y crea una petición."}</p>}
      </div>
      <p className="np-note np-rule">Ningún agente publica ni gasta sin tu aprobación.</p>
    </>
  );
}

const CONNECT_NOTICES: Record<string, { tone: "ok" | "warn"; text: string }> = {
  conectada: { tone: "ok", text: "Cuenta de Instagram conectada." },
  cancelada: { tone: "warn", text: "Cancelaste la conexión en Instagram. No se guardó nada." },
  vencida: { tone: "warn", text: "La conexión tardó demasiado o no coincide. Vuelve a intentarlo." },
  "sin-cuentas": { tone: "warn", text: "No elegiste ninguna cuenta de Instagram al autorizar. Vuelve a conectar y marca la cuenta. Debe ser profesional (empresa o creador)." },
  "falta-app": { tone: "warn", text: "Falta la clave de la app de Meta en el servidor (META_APP_SECRET)." },
  "falta-seguridad": { tone: "warn", text: "Para conectar cuentas reales el panel necesita contraseña y clave de cifrado (NEXOPIX_PANEL_PASSWORD y NEXOPIX_SECRET)." },
  "falta-base": { tone: "warn", text: "Para conectar cuentas reales hace falta la base de datos permanente (DATABASE_URL)." },
  error: { tone: "warn", text: "Instagram no completó la conexión. Vuelve a intentarlo en unos minutos." },
};

function Networks({ snap, busy, onRemove, onSaved }: { snap: Snapshot; busy: boolean; onRemove: (id: string) => void; onSaved: (snapshot: Snapshot) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("red");
    if (code) {
      setNotice(code);
      window.history.replaceState(null, "", "/panel");
    }
  }, []);

  const message = notice ? CONNECT_NOTICES[notice] : null;
  return (
    <section aria-label="Redes" className="np-rows">
      {message && <p className={`np-notice np-notice--${message.tone}`} role="status">{message.text}</p>}
      <div className="nets-head">
        <p className="np-note">{snap.accounts.length === 0 ? "Todavía no agregaste ninguna red." : `${snap.accounts.length} ${snap.accounts.length === 1 ? "red" : "redes"}`}</p>
        <button type="button" className="np-btn np-btn--go" onClick={() => setAdding(true)}>Agregar red</button>
      </div>
      {snap.accounts.length === 0 && (
        <div className="empty">
          <h2>Conecta tu primera red</h2>
          <p>Con Instagram conectado, el equipo puede publicar por ti cuando apruebes. También puedes agregar una cuenta sin conectarla para ir planificando.</p>
          <button type="button" className="np-btn np-btn--go" onClick={() => setAdding(true)}>Agregar red</button>
        </div>
      )}
      {snap.accounts.map((account) => {
        const complete = PROFILE_FIELDS.every((field) => account[field.key].trim());
        const expanded = open === account.id;
        return (
          <article key={account.id} className="net">
            <div className="net__row">
              {account.avatarUrl ? (
                <Image className="net__avatar" src={account.avatarUrl} alt="" width={42} height={42} unoptimized />
              ) : (
                <span className={`net__tile net__tile--${account.network}`} aria-hidden="true">{account.handle.replace("@", "").charAt(0).toUpperCase()}</span>
              )}
              <div className="net__text">
                <strong>{account.handle}</strong>
                <small>{`${account.network === "instagram" ? "Instagram" : "Facebook"}${account.linked ? ", conectada" : ", sin conectar"}${account.followers != null ? `, ${account.followers.toLocaleString("es-CR")} seguidores` : ""}`}</small>
              </div>
              <p className="net__stat"><b>{snap.agenda.filter((item) => item.accountId === account.id).length}</b> esta semana</p>
              <p className={`net__flag${complete ? " is-ok" : ""}`}>{complete ? "Perfil listo" : "Falta el perfil"}</p>
              <div className="net__act">
                <button type="button" className="np-btn" aria-expanded={expanded} onClick={() => animate(() => setOpen(expanded ? null : account.id))}>{expanded ? "Cerrar perfil" : "Ver perfil"}</button>
                {!account.linked && account.network === "instagram" && <a className="np-btn np-btn--go" href={`/api/meta/connect?cuenta=${encodeURIComponent(account.id)}`}>Conectar</a>}
                <button type="button" className="np-btn" disabled={busy} onClick={() => onRemove(account.id)}>{account.linked ? "Desconectar" : "Quitar"}</button>
              </div>
            </div>
            {expanded && <Profile account={account} onSaved={onSaved} />}
          </article>
        );
      })}
      {adding && <AddNetwork canConnect={snap.canConnect} onClose={() => setAdding(false)} onSaved={(next) => { setAdding(false); onSaved(next); }} />}
    </section>
  );
}

function AddNetwork({ canConnect, onClose, onSaved }: { canConnect: boolean; onClose: () => void; onSaved: (snapshot: Snapshot) => void }) {
  const [network, setNetwork] = useState("instagram");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    start(async () => {
      try {
        const result = await addAccount(network, name, brand);
        if (result.snapshot) onSaved(result.snapshot);
        else setError(result.error ?? "No se agregó la red.");
      } catch {
        setError("No se agregó la red. Revisa la conexión y vuelve a intentarlo.");
      }
    });
  };

  return (
    <div className="np-scrim">
      <form role="dialog" aria-modal="true" aria-label="Agregar red" className="sheet" onSubmit={submit}>
        <div className="sheet__head">
          <AgentMark agent="enrutador" size={44} />
          <div>
            <h2>Agregar red</h2>
            <p>Conecta Instagram para publicar, o agrega la cuenta para planificar.</p>
          </div>
          <button type="button" className="sheet__close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        <a className={`connect${canConnect ? "" : " is-off"}`} href="/api/meta/connect" aria-disabled={!canConnect}>
          <span className="net__tile net__tile--instagram" aria-hidden="true">I</span>
          <span>
            <strong>Conectar con Instagram</strong>
            <small>{canConnect ? "Entras con Instagram o Facebook, eliges la cuenta y autorizas a Nexopix a publicar." : "Disponible cuando el servidor tenga la clave de Meta, la base y la contraseña."}</small>
          </span>
        </a>
        <p className="sheet__or">o agrégala sin conectar</p>
        <fieldset>
          <legend>Red</legend>
          <div className="choices">
            {[["instagram", "Instagram"], ["facebook", "Página de Facebook"]].map(([id, label]) => (
              <button key={id} type="button" className={network === id ? "is-on" : ""} aria-pressed={network === id} onClick={() => setNetwork(id)}>{label}</button>
            ))}
          </div>
        </fieldset>
        <label>
          {network === "instagram" ? "Usuario de Instagram" : "Nombre de la página"}
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder={network === "instagram" ? "@tu.marca" : ""} autoComplete="off" />
        </label>
        <label>
          Marca
          <input value={brand} onChange={(event) => setBrand(event.target.value)} maxLength={80} />
        </label>
        {error && <p className="np-alert" role="alert">{error}</p>}
        <button type="submit" className="np-btn np-btn--wide" disabled={saving}>Agregar sin conectar</button>
      </form>
    </div>
  );
}

function Profile({ account, onSaved }: { account: Account; onSaved: (snapshot: Snapshot) => void }) {
  const [values, setValues] = useState({ website: account.website, voice: account.voice, offer: account.offer, audience: account.audience, neverPromise: account.neverPromise, businessInfo: account.businessInfo });
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const set = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setNotice(null);
    setValues((current) => ({ ...current, [key]: event.target.value }));
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    start(async () => {
      try {
        const result = await saveProfile(account.id, values);
        if (result.snapshot) {
          onSaved(result.snapshot);
          setNotice("Perfil guardado.");
        } else {
          setNotice(result.error ?? "No se guardó el perfil.");
        }
      } catch {
        setNotice("No se guardó el perfil. Revisa la conexión y vuelve a intentarlo.");
      }
    });
  };
  return (
    <form className="profile" onSubmit={submit}>
      <p className="np-note">El Guionista escribe con este perfil.</p>
      <label className="profile__wide">
        Sitio web
        <input value={values.website} onChange={set("website")} maxLength={200} inputMode="url" />
      </label>
      {PROFILE_FIELDS.map((field) => (
        <label key={field.key}>
          {field.label}
          <textarea value={values[field.key]} onChange={set(field.key)} rows={2} maxLength={field.key === "businessInfo" ? 1000 : 400} />
        </label>
      ))}
      <div className="profile__foot">
        <button type="submit" className="np-btn np-btn--go" disabled={saving}>Guardar perfil</button>
        {notice && <p role="status">{notice}</p>}
      </div>
    </form>
  );
}

function Results({ snap, accountOf }: { snap: Snapshot; accountOf: (id: string) => Account | undefined }) {
  const [copied, setCopied] = useState<number | null>(null);
  const pendingToday = snap.agenda.filter((item) => item.scheduledOn === snap.today && !item.done).length;
  const rows = snap.results
    .map((result) => ({ ...result, piece: snap.pieces.find((piece) => piece.id === result.pieceId) }))
    .filter((row) => row.piece)
    .sort((a, b) => b.leads - a.leads);
  const top = Math.max(...rows.map((row) => row.leads), 1);
  const copy = async (id: number, link: string) => {
    await navigator.clipboard.writeText(link);
    setCopied(id);
  };
  return (
    <section aria-label="Resultados" className="np-rows">
      <div className="summary">
        <AgentMark agent="analista" size={64} />
        <div>
          <h2>Resumen de hoy</h2>
          <ul>{morningSummary(snap.pieces, snap.results, pendingToday).map((line) => <li key={line}>{line}</li>)}</ul>
        </div>
      </div>
      <section aria-label="Qué pieza trajo cada consulta" className="group">
        <h2>Qué pieza trajo cada consulta</h2>
        {rows.map(({ piece, clicks, leads, pieceId }) => {
          const owner = accountOf(piece!.accountId);
          const link = owner ? trackedLink(owner.website, owner.network, piece!) : null;
          return (
            <article key={pieceId} className="result">
              <div className="piece__text">
                <strong>{piece!.title}</strong>
                <small>{owner?.handle}</small>
              </div>
              <p className="result__bar" aria-label={`${leads} consultas`}><span style={{ width: `${(leads / top) * 100}%` }} /><b>{leads}</b></p>
              <p className="result__clicks"><b>{clicks}</b> clics</p>
              {link && <button type="button" className="np-btn" onClick={() => copy(pieceId, link)}>{copied === pieceId ? "Enlace copiado" : "Copiar enlace"}</button>}
            </article>
          );
        })}
        {rows.length === 0 && <p className="np-note">Cuando publiques una pieza, aquí verás qué trajo.</p>}
      </section>
      <p className="np-note">Las cifras llegan de las redes conectadas.</p>
    </section>
  );
}

function NewRequest({ snap, date, onClose, onSaved }: { snap: Snapshot; date: string; onClose: () => void; onSaved: (snapshot: Snapshot) => void }) {
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
        else setError(result.error ?? "No se guardó la petición.");
      } catch {
        setError("No se guardó la petición. Revisa la conexión y vuelve a intentarlo.");
      }
    });
  };

  const lane = { reels: "Reels", posts: "Publicaciones", ads: "Meta Ads" }[FORMATS[format].pipeline];
  const weekday = LONG_DAYS[(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7].toLowerCase();

  return (
    <div className="np-scrim">
      <form role="dialog" aria-modal="true" aria-label="Nueva petición" className="sheet" onSubmit={submit}>
        <div className="sheet__head">
          <AgentMark agent="enrutador" size={44} />
          <div>
            <h2>Nueva petición</h2>
            <p>El Enrutador la manda a {lane}, para el {weekday} {dayNumber(date)}.</p>
          </div>
          <button type="button" className="sheet__close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        <label>
          Qué quieres publicar
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} autoFocus />
        </label>
        <fieldset>
          <legend>Formato</legend>
          <div className="choices">
            {(Object.keys(FORMATS) as Format[]).map((key) => (
              <button key={key} type="button" className={format === key ? "is-on" : ""} aria-pressed={format === key} onClick={() => setFormat(key)}>{FORMATS[key].label}</button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Cuenta</legend>
          <div className="choices">
            {snap.accounts.map((account) => (
              <button key={account.id} type="button" className={accountId === account.id ? "is-on" : ""} aria-pressed={accountId === account.id} onClick={() => setAccountId(account.id)}>{account.handle}</button>
            ))}
          </div>
        </fieldset>
        {error && <p className="np-alert" role="alert">{error}</p>}
        {snap.accounts.length === 0 && <p className="np-alert" role="alert">Primero agrega una red en la pestaña Redes.</p>}
        <button type="submit" className="np-btn np-btn--go np-btn--wide" disabled={saving || snap.accounts.length === 0}>Enviar al equipo</button>
      </form>
    </div>
  );
}
