"use client";

import { useEffect, useState } from "react";
import { intakeEntries } from "../../app/panel/actions";
import { useI18n } from "../../i18n/client";
import { AgentMark } from "./Marks";

type Entry = Awaited<ReturnType<typeof intakeEntries>>[number];
type Filter = "all" | "accepted" | "repeated" | "refused";

/** Every request that reached the gatekeeper: accepted, repeated or refused with its reason, newest first. */
export default function IntakeSheet({ onClose, onOpenPiece }: { onClose: () => void; onOpenPiece: (pieceId: number) => void }) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<Filter>("all");
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setEntries(null);
    intakeEntries(filter === "all" ? undefined : filter)
      .then((rows) => live && setEntries(rows))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [filter]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  const when = new Intl.DateTimeFormat(t.locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Costa_Rica" });
  return (
    <div className="np-scrim" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-label={t.intake.title} className="sheet trace intake">
        <div className="sheet__head detail__head">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AgentMark agent="gatekeeper" size={40} />
            <div>
              <h2>{t.intake.title}</h2>
              <p>{t.intake.lead}</p>
            </div>
          </div>
          <button type="button" className="sheet__close" aria-label={t.common.close} onClick={onClose} autoFocus>×</button>
        </div>
        <div className="np-seg piece-sheet__tabs" role="group" aria-label={t.intake.filter}>
          {(["all", "accepted", "repeated", "refused"] as const).map((id) => (
            <button key={id} type="button" aria-pressed={filter === id} className={filter === id ? "is-on" : ""} onClick={() => setFilter(id)}>{t.intake.filters[id]}</button>
          ))}
        </div>
        <div className="piece-sheet__body">
          {failed && <p className="np-alert" role="alert">{t.intake.failed}</p>}
          {!entries && !failed && <p className="np-note" aria-live="polite">{t.trace.loading}</p>}
          {entries?.length === 0 && <p className="np-note">{t.intake.empty}</p>}
          {entries && entries.length > 0 && (
            <ol className="intake__list">
              {entries.map((entry) => (
                <li key={entry.id} className={`intake__row is-${entry.outcome}`}>
                  <span className={`intake__badge is-${entry.outcome}`}>{t.intake.outcomes[entry.outcome] ?? entry.outcome}</span>
                  <div className="intake__main">
                    <strong>{entry.goal ?? t.intake.noGoal}</strong>
                    <small>
                      {[entry.source?.toUpperCase(), entry.account, entry.format ? t.formats[entry.format] ?? entry.format : null].filter(Boolean).join(" · ")}
                    </small>
                    {entry.message && <p className="intake__reason">{entry.message}</p>}
                    {entry.traceId && <small>{`${t.trace.traceId} ${entry.traceId}`}</small>}
                  </div>
                  <div className="intake__side">
                    <time dateTime={entry.at}>{when.format(new Date(entry.at))}</time>
                    {entry.pieceId && (
                      <button type="button" className="np-btn" onClick={() => onOpenPiece(entry.pieceId!)}>{t.trace.piece(entry.pieceId)}</button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}
