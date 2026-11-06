"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import { addPublication, advance, decide, toggleAccount, toggleAgent, toggleItem } from "../../app/panel/actions";
import { addDays } from "../../lib/dates";
import type { Snapshot } from "../../lib/panel";
import { FORMATS, type Format } from "../../lib/portero";
import { AGENT_COLORS, Sprite } from "./Sprite";

type View = "team" | "week" | "accounts";
type Piece = Snapshot["pieces"][number];

const LANES = [
  { id: "reels", label: "Reels" },
  { id: "posts", label: "Publicaciones" },
  { id: "ads", label: "Meta Ads" },
];
const STATIONS = [
  { stage: 0, name: "Idea", agent: "estratega", verb: "Trabaja" },
  { stage: 1, name: "Producción", agent: "guionista", verb: "Escribe" },
  { stage: 2, name: "Revisión", agent: "persona", verb: "" },
  { stage: 3, name: "Programado", agent: "programador", verb: "Agenda" },
  { stage: 4, name: "Publicado", agent: "analista", verb: "Mide" },
];
const REVIEW = 2;
const LAST_STAGE = 4;
const TABS: { id: View; label: string }[] = [
  { id: "team", label: "Equipo" },
  { id: "week", label: "Semana" },
  { id: "accounts", label: "Cuentas" },
];
const SHORT_DAYS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const LONG_DAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

const dayNumber = (date: string) => Number(date.slice(8));
const formatLabel = (format: string) => FORMATS[format as Format]?.label ?? format;
const pieces = (count: number) => (count === 1 ? "1 pieza" : `${count} piezas`);

/** Moves the screen from one state to the next: each piece travels to its new station instead of jumping there. */
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
  const [day, setDay] = useState(snap.today);
  const [open, setOpen] = useState<string | null>(null);
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

  const go = (next: View) => {
    if (next !== view) animate(() => setView(next), "page");
  };
  const agentOf = (id: string) => snap.agents.find((agent) => agent.id === id);
  const accountOf = (id: string) => snap.accounts.find((account) => account.id === id);
  const decisions = snap.approvals.length;

  return (
    <div className="np">
      <header className="np-bar">
        <Link href="/" className="np-brand">
          <Image src="/logo.png" alt="" width={28} height={28} />
          <span>Nexopix</span>
        </Link>
        <nav aria-label="Principal" className="np-tabs">
          {TABS.map((tab) => (
            <button key={tab.id} type="button" className={view === tab.id ? "is-on" : ""} aria-current={view === tab.id ? "page" : undefined} onClick={() => go(tab.id)}>
              {tab.label}
              {tab.id === "team" && decisions > 0 && <b aria-label={`${decisions} por aprobar`}>{decisions}</b>}
            </button>
          ))}
        </nav>
        {snap.isTest && <p className="np-test">Datos de prueba</p>}
        <button type="button" className="np-btn np-btn--go" onClick={() => setSheet(true)}>Nueva petición</button>
      </header>

      <main className="np-main">
        {failure && <p className="np-alert" role="alert">{failure}</p>}

        {view === "team" && (
          <Floor
            snap={snap}
            busy={busy}
            open={open}
            onOpen={(id) => setOpen(open === id ? null : id)}
            agentOf={agentOf}
            accountOf={accountOf}
            onAdvance={(id) => run(() => advance(id))}
            onDecide={(id, approved) => run(() => decide(id, approved))}
            onToggleAgent={(id) => run(() => toggleAgent(id))}
          />
        )}

        {view === "week" && (
          <section aria-label="Semana" className="np-week">
            {Array.from({ length: 7 }, (_, index) => addDays(snap.weekStart, index)).map((date, index) => {
              const items = snap.agenda.filter((item) => item.scheduledOn === date);
              return (
                <div key={date} className={`np-day${date === snap.today ? " is-today" : ""}${date === day ? " is-picked" : ""}`}>
                  <button type="button" className="np-day__head" aria-pressed={date === day} onClick={() => setDay(date)}>
                    <span>{SHORT_DAYS[index]}</span>
                    <strong>{dayNumber(date)}</strong>
                  </button>
                  {items.map((item) => (
                    <button key={item.id} type="button" className={`np-slot${item.done ? " is-done" : ""}`} aria-pressed={item.done} disabled={busy} onClick={() => run(() => toggleItem(item.id))}>
                      <small>{item.time}</small>
                      <strong>{item.title}</strong>
                      <small>{`${formatLabel(item.format)} en ${accountOf(item.accountId)?.handle}`}</small>
                    </button>
                  ))}
                </div>
              );
            })}
          </section>
        )}

        {view === "accounts" && (
          <section aria-label="Cuentas" className="np-accounts">
            {snap.accounts.map((account) => (
              <article key={account.id} className="np-account">
                <div>
                  <h2>{account.handle}</h2>
                  <p>{`${account.network === "instagram" ? "Instagram" : "Facebook"}, ${account.brand}`}</p>
                </div>
                <p className="np-account__count"><strong>{snap.agenda.filter((item) => item.accountId === account.id).length}</strong> esta semana</p>
                <button type="button" className={`np-btn${account.linked ? "" : " np-btn--go"}`} disabled={busy} onClick={() => run(() => toggleAccount(account.id))}>
                  {account.linked ? "Desconectar" : "Conectar con Meta"}
                </button>
              </article>
            ))}
            <p className="np-note">Seguidores y alcance aparecen al conectar cada cuenta. Por ahora la conexión es simulada.</p>
          </section>
        )}
      </main>

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

type Agent = Snapshot["agents"][number];

function Crew({ id, agent, stage, line, open, busy, onOpen, onToggle }: { id: string; agent?: Agent; stage: string; line: string; open: boolean; busy: boolean; onOpen: (id: string) => void; onToggle: (id: string) => void }) {
  const off = agent ? !agent.active : false;
  const working = !off && !line.startsWith("Sin");
  return (
    <div className={`crew${off ? " is-off" : ""}${working ? " is-busy" : ""}`} style={{ "--agent": AGENT_COLORS[id]?.main } as CSSProperties}>
      <button type="button" className="crew__who" aria-expanded={open} onClick={() => onOpen(id)}>
        <Sprite agent={id} />
        <strong>{agent?.name}</strong>
        <small>{off ? "Apagado" : line}</small>
        <span className="crew__stage">{stage}</span>
      </button>
      {open && agent && (
        <div className="crew__pop">
          <p>{agent.job}</p>
          <button type="button" role="switch" aria-checked={agent.active} className={`np-switch${agent.active ? " is-on" : ""}`} disabled={busy} onClick={() => onToggle(id)}>
            <span><i /></span>
            {agent.active ? "Encendido" : "Apagado"}
          </button>
        </div>
      )}
    </div>
  );
}

type FloorProps = {
  snap: Snapshot;
  busy: boolean;
  open: string | null;
  onOpen: (id: string) => void;
  agentOf: (id: string) => Agent | undefined;
  accountOf: (id: string) => Snapshot["accounts"][number] | undefined;
  onAdvance: (id: number) => void;
  onDecide: (id: number, approved: boolean) => void;
  onToggleAgent: (id: string) => void;
};

/** The team at work: every station is an agent, the person included, and the pieces travel between them. */
function Floor({ snap, busy, open, onOpen, agentOf, accountOf, onAdvance, onDecide, onToggleAgent }: FloorProps) {
  const atStage = (stage: number) => snap.pieces.filter((piece) => piece.stage === stage);
  const moving = snap.pieces.filter((piece) => piece.stage < LAST_STAGE).length;

  const status = (station: (typeof STATIONS)[number]) => {
    const count = atStage(station.stage).length;
    if (station.agent === "persona") return count === 0 ? "Nada por aprobar" : `${count} por aprobar`;
    return count === 0 ? "Sin trabajo" : `${station.verb} ${pieces(count)}`;
  };

  const tile = (piece: Piece) => {
    const approval = snap.approvals.find((item) => item.pieceId === piece.id);
    const station = STATIONS[piece.stage];
    const agent = agentOf(station.agent);
    const nextName = STATIONS[piece.stage + 1]?.name.toLowerCase();
    return (
      <article key={piece.id} className="tile" style={{ viewTransitionName: `piece-${piece.id}` }}>
        <strong>{piece.title}</strong>
        <small>{`${formatLabel(piece.format)} en ${accountOf(piece.accountId)?.handle}`}</small>
        {piece.stage === REVIEW && approval ? (
          <div className="tile__decide">
            <button type="button" className="np-btn np-btn--human" disabled={busy} onClick={() => onDecide(approval.id, true)}>Aprobar</button>
            <button type="button" className="np-btn" disabled={busy} onClick={() => onDecide(approval.id, false)}>Rechazar</button>
          </div>
        ) : piece.stage < LAST_STAGE && piece.stage !== REVIEW ? (
          <button type="button" className="tile__next" disabled={busy || agent?.active === false} onClick={() => onAdvance(piece.id)}>
            {agent?.active === false ? `${agent.name} está apagado` : `Pasar a ${nextName}`}
          </button>
        ) : null}
      </article>
    );
  };

  return (
    <section aria-label="Equipo" className="floor">
      <div className="floor__start">
        <Crew id="enrutador" agent={agentOf("enrutador")} stage="Entrada" line={moving === 0 ? "Sin trabajo" : `Reparte ${pieces(moving)}`} open={open === "enrutador"} busy={busy} onOpen={onOpen} onToggle={onToggleAgent} />
      </div>
      {LANES.map((lane, index) => (
        <p key={lane.id} className="floor__lane" style={{ gridRow: index + 2 }}>
          {lane.label}
          <small>{snap.pieces.filter((piece) => piece.pipeline === lane.id).length}</small>
        </p>
      ))}
      {STATIONS.map((station, column) => (
        <div key={station.stage} className={`station${station.agent === "persona" ? " station--human" : ""}`} style={{ "--column": column + 2 } as CSSProperties}>
          <div className="station__head">
            {station.agent === "persona" ? (
              <div className={`crew crew--human${atStage(REVIEW).length > 0 ? " is-busy" : ""}`}>
                <div className="crew__who">
                  <Sprite agent="persona" />
                  <strong>Tú</strong>
                  <small>{status(station)}</small>
                  <span className="crew__stage">{station.name}</span>
                </div>
              </div>
            ) : (
              <Crew id={station.agent} agent={agentOf(station.agent)} stage={station.name} line={status(station)} open={open === station.agent} busy={busy} onOpen={onOpen} onToggle={onToggleAgent} />
            )}
          </div>
          {LANES.map((lane, row) => {
            const here = snap.pieces.filter((piece) => piece.pipeline === lane.id && piece.stage === station.stage);
            return (
              <div key={lane.id} className={`station__cell${here.length === 0 ? " is-empty" : ""}`} style={{ gridRow: row + 2 }}>
                {here.map(tile)}
              </div>
            );
          })}
        </div>
      ))}
      <p className="floor__rule">Ningún agente publica ni gasta sin tu aprobación.</p>
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

  const lane = LANES.find((item) => item.id === FORMATS[format].pipeline)?.label;
  const weekday = LONG_DAYS[(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7];

  return (
    <div className="np-scrim">
      <form role="dialog" aria-modal="true" aria-label="Nueva petición" className="np-sheet" onSubmit={submit}>
        <div className="np-sheet__head">
          <Sprite agent="enrutador" size={48} />
          <div>
            <h2>Nueva petición</h2>
            <p>El Enrutador la manda a {lane}, para el {weekday} {dayNumber(date)}.</p>
          </div>
          <button type="button" className="np-sheet__close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        <label>
          Qué quieres publicar
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} autoFocus />
        </label>
        <fieldset>
          <legend>Formato</legend>
          <div className="np-choices">
            {(Object.keys(FORMATS) as Format[]).map((key) => (
              <button key={key} type="button" className={format === key ? "is-on" : ""} aria-pressed={format === key} onClick={() => setFormat(key)}>{FORMATS[key].label}</button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Cuenta</legend>
          <div className="np-choices">
            {snap.accounts.map((account) => (
              <button key={account.id} type="button" className={accountId === account.id ? "is-on" : ""} aria-pressed={accountId === account.id} onClick={() => setAccountId(account.id)}>{account.handle}</button>
            ))}
          </div>
        </fieldset>
        {error && <p className="np-alert" role="alert">{error}</p>}
        <button type="submit" className="np-btn np-btn--go np-btn--wide" disabled={saving}>Enviar al equipo</button>
      </form>
    </div>
  );
}
