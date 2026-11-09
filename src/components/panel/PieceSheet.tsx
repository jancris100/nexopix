"use client";

import { useEffect, useState, useTransition } from "react";
import { decide, pieceDetail, publishNow, savePieceContent } from "../../app/panel/actions";
import { useI18n } from "../../i18n/client";
import type { Dictionary } from "../../i18n/dictionaries";
import { todayInCostaRica } from "../../lib/dates";
import type { Snapshot } from "../../lib/panel";
import { AgentMark } from "./Marks";

type Detail = NonNullable<Awaited<ReturnType<typeof pieceDetail>>>;
type Version = Detail["versions"][number];

const REVIEW = 2;
const SCHEDULED = 3;
const PUBLISHED = 4;
const STAGE_ACTORS = ["strategist", "writer", "human", "scheduler", "analyst"];
const isVideo = (url: string) => /\.(mp4|mov|m4v)(\?|#|$)/i.test(url);
const agentName = (t: Dictionary, id: string) => t.agents[id]?.name ?? id;

/**
 * One piece opened: its content as it will look, the form to write a new version (in the name of the agent of its
 * stage, until the agents write on their own), the decision when it is in review, publishing when it is scheduled,
 * and its trace.
 */
export default function PieceSheet({ pieceId, snapshotPiece, approvalId, onClose, onSnapshot }: {
  pieceId: number;
  snapshotPiece: Snapshot["pieces"][number];
  approvalId?: number;
  onClose: () => void;
  onSnapshot: (next: Snapshot) => void;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"content" | "trace">("content");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    pieceDetail(pieceId)
      .then((value) => live && (value ? setDetail(value) : setFailed(true)))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [pieceId]);

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  return (
    <div className="np-scrim" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-label={snapshotPiece.title} className="sheet trace piece-sheet">
        <div className="sheet__head detail__head">
          <div>
            <h2>{snapshotPiece.title}</h2>
            <p>{`${t.trace.piece(pieceId)} · ${t.formats[snapshotPiece.format] ?? snapshotPiece.format}${detail?.account ? ` · ${detail.account.handle}` : ""} · ${t.stages[snapshotPiece.stage]}`}</p>
          </div>
          <button type="button" className="sheet__close" aria-label={t.common.close} onClick={onClose} autoFocus>×</button>
        </div>
        <div className="np-seg piece-sheet__tabs" role="tablist">
          {(["content", "trace"] as const).map((id) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "is-on" : ""} onClick={() => setTab(id)}>{t.piece.tabs[id]}</button>
          ))}
        </div>
        <div className="piece-sheet__body">
          {failed && <p className="np-alert" role="alert">{t.trace.failed}</p>}
          {!detail && !failed && <p className="np-note" aria-live="polite">{t.trace.loading}</p>}
          {detail && tab === "content" && (
            <Content detail={detail} approvalId={approvalId} onDetail={setDetail} onSnapshot={onSnapshot} onDecided={onClose} />
          )}
          {detail && tab === "trace" && <Trace detail={detail} />}
        </div>
      </section>
    </div>
  );
}

function Content({ detail, approvalId, onDetail, onSnapshot, onDecided }: {
  detail: Detail;
  approvalId?: number;
  onDetail: (next: Detail) => void;
  onSnapshot: (next: Snapshot) => void;
  onDecided: () => void;
}) {
  const { t } = useI18n();
  const current: Version | undefined = detail.versions[0];
  const [values, setValues] = useState({
    idea: current?.idea ?? "",
    caption: current?.caption ?? "",
    hashtags: current?.hashtags ?? "",
    media: (current?.media ?? []).join("\n"),
  });
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  const locked = detail.stage >= PUBLISHED;
  const author = STAGE_ACTORS[Math.min(detail.stage, 4)];
  const media = values.media.split("\n").map((line) => line.trim()).filter(Boolean);
  const set = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setNotice(null);
    setValues((previous) => ({ ...previous, [key]: event.target.value }));
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    start(async () => {
      try {
        const result = await savePieceContent(detail.id, { ...values, media }, note);
        if ("error" in result) {
          setNotice({ ok: false, text: result.error ?? t.piece.failed });
          return;
        }
        if (result.detail) {
          onDetail(result.detail);
          // Show what was saved: hashtags and files come back cleaned.
          const saved = result.detail.versions[0];
          if (saved) setValues({ idea: saved.idea, caption: saved.caption, hashtags: saved.hashtags, media: saved.media.join("\n") });
        }
        onSnapshot(result.snapshot);
        setNote("");
        setNotice({ ok: true, text: t.piece.saved });
      } catch {
        setNotice({ ok: false, text: `${t.piece.failed} ${t.common.retry}` });
      }
    });
  };

  return (
    <div className="piece-sheet__content">
      <div className="piece-preview">
        <p className="piece-preview__label">{t.piece.preview}</p>
        <div className="piece-preview__card">
          {media.length > 0 ? (
            <div className={`piece-preview__media${media.length > 1 ? " is-many" : ""}`}>
              {media.slice(0, 4).map((url) =>
                isVideo(url) ? (
                  <video key={url} src={url} muted playsInline preload="metadata" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- addresses chosen by the person or the agents, shown as they are.
                  <img key={url} src={url} alt="" referrerPolicy="no-referrer" />
                ),
              )}
            </div>
          ) : (
            <p className="piece-preview__empty">{t.piece.noMedia}</p>
          )}
          <p className="piece-preview__caption">
            {values.caption.trim() || <span className="np-note">{t.piece.noCaption}</span>}
            {values.hashtags.trim() && <span className="piece-preview__tags">{values.hashtags}</span>}
          </p>
        </div>
        {detail.product && <p className="np-note">{t.piece.product(detail.product.name)}</p>}
        <Versions versions={detail.versions} />
      </div>

      <div className="piece-sheet__side">
        {detail.stage === REVIEW && approvalId && <Decision detail={detail} approvalId={approvalId} onSnapshot={onSnapshot} onDecided={onDecided} />}
        {detail.stage === SCHEDULED && <Publish detail={detail} onDetail={onDetail} onSnapshot={onSnapshot} />}
        {locked ? (
          <div className="piece-sheet__done">
            <p className="np-note">{t.piece.locked}</p>
            {detail.permalink && <a className="np-btn np-btn--go np-btn--wide" href={detail.permalink} target="_blank" rel="noreferrer">{t.piece.open}</a>}
          </div>
        ) : (
          <form className="piece-form" onSubmit={save}>
            <label>
              {t.piece.idea}
              <textarea value={values.idea} onChange={set("idea")} rows={3} maxLength={2000} />
            </label>
            <label>
              {t.piece.caption}
              <textarea value={values.caption} onChange={set("caption")} rows={5} maxLength={2200} />
            </label>
            <label>
              {t.piece.hashtags}
              <input value={values.hashtags} onChange={set("hashtags")} maxLength={600} />
              <small>{t.piece.hashtagsHint}</small>
            </label>
            <label>
              {t.piece.media}
              <textarea value={values.media} onChange={set("media")} rows={3} spellCheck={false} />
              <small>{t.piece.mediaHint}</small>
            </label>
            <label>
              {t.piece.note}
              <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={300} />
            </label>
            <div className="piece-form__foot">
              <button type="submit" className="np-btn np-btn--go" disabled={busy}>
                <AgentMark agent={author} size={22} /> {t.piece.saveAs(agentName(t, author))}
              </button>
              {notice && <p role="status" className={notice.ok ? "is-ok" : "is-bad"}>{notice.text}</p>}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Versions({ versions }: { versions: Version[] }) {
  const { t } = useI18n();
  const when = new Intl.DateTimeFormat(t.locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Costa_Rica" });
  if (versions.length === 0) return null;
  return (
    <div className="piece-versions">
      <p className="piece-preview__label">{t.piece.versions}</p>
      <ol>
        {versions.map((version) => (
          <li key={version.id}>
            <AgentMark agent={version.author} size={22} />
            <span>
              <strong>{t.piece.version(version.version)}</strong> · {agentName(t, version.author)} · <time dateTime={version.createdAt}>{when.format(new Date(version.createdAt))}</time>
              {version.note && version.note !== "backfilled" && <small>{version.note}</small>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Decision({ detail, approvalId, onSnapshot, onDecided }: { detail: Detail; approvalId: number; onSnapshot: (next: Snapshot) => void; onDecided: () => void }) {
  const { t } = useI18n();
  const today = todayInCostaRica();
  const [day, setDay] = useState(detail.publishOn && detail.publishOn >= today ? detail.publishOn : today);
  const [time, setTime] = useState("10:00");
  const [reason, setReason] = useState("");
  const [busy, start] = useTransition();
  const act = (approved: boolean) =>
    start(async () => {
      onSnapshot(await decide(approvalId, approved, approved ? { day, time } : { reason }));
      onDecided();
    });
  return (
    <div className="piece-decision">
      <p className="piece-preview__label">{t.piece.decide}</p>
      <div className="piece-decision__when">
        <label>{t.piece.when}<input type="date" value={day} min={today} onChange={(event) => setDay(event.target.value)} /></label>
        <label>{t.piece.at}<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
      </div>
      <button type="button" className="np-btn np-btn--human np-btn--wide" disabled={busy} onClick={() => act(true)}>{t.piece.approve}</button>
      <label className="piece-decision__reason">
        {t.piece.reason}
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} maxLength={500} />
      </label>
      <button type="button" className="np-btn np-btn--wide" disabled={busy} onClick={() => act(false)}>{t.piece.reject}</button>
    </div>
  );
}

function Publish({ detail, onDetail, onSnapshot }: { detail: Detail; onDetail: (next: Detail) => void; onSnapshot: (next: Snapshot) => void }) {
  const { t } = useI18n();
  const [busy, start] = useTransition();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const when = detail.scheduledAt
    ? new Intl.DateTimeFormat(t.locale, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Costa_Rica" }).format(new Date(detail.scheduledAt))
    : null;
  const canPublish = detail.account?.network === "instagram" && detail.account.linked;
  const publish = () =>
    start(async () => {
      try {
        const result = await publishNow(detail.id);
        if (result.detail) onDetail(result.detail);
        onSnapshot(result.snapshot);
        setNotice({ ok: result.ok, text: result.message });
      } catch {
        setNotice({ ok: false, text: t.piece.publishFailed(t.common.retry) });
      }
    });
  return (
    <div className="piece-decision">
      {when && <p>{t.piece.scheduledFor(when)}</p>}
      {canPublish ? (
        <button type="button" className="np-btn np-btn--go np-btn--wide" disabled={busy} onClick={publish}>{busy ? t.piece.publishing : t.piece.publishNow}</button>
      ) : (
        <p className="np-note">{t.piece.notConnected}</p>
      )}
      {notice && <p role="status" className={notice.ok ? "is-ok" : "np-alert"}>{notice.text}</p>}
    </div>
  );
}

function Trace({ detail }: { detail: Detail }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const events = detail.events;
  const when = new Intl.DateTimeFormat(t.locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Costa_Rica" });
  const source = events.find((event) => event.type === "received")?.detail;
  const reference = source?.reference ? String(source.reference) : null;
  const shortReference = reference && reference.length > 24 ? `…${reference.slice(-12)}` : reference;
  const copy = async () => {
    if (!reference) return;
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };
  return (
    <>
      <dl className="trace__meta">
        <div><dt>{t.trace.piece(detail.id)}</dt><dd>{t.trace.lead}</dd></div>
        {source?.source && <div><dt>{t.trace.source}</dt><dd>{String(source.source).toUpperCase()}</dd></div>}
        {reference && (
          <div>
            <dt>{t.trace.reference}</dt>
            <dd>
              <code title={reference}>{shortReference}</code>
              <button type="button" className="trace__copy" onClick={copy} aria-label={t.trace.copy} title={t.trace.copy}>{copied ? t.trace.copied : "⧉"}</button>
            </dd>
          </div>
        )}
        <div><dt>{t.trace.steps(events.length)}</dt><dd /></div>
      </dl>
      {events.length === 0 ? (
        <p className="np-note">{t.trace.empty}</p>
      ) : (
        <ol className="trace__list">
          {events.map((event, index) => (
            <li key={`${event.at}-${index}`} className={`trace__item${event.actor === "human" ? " is-human" : ""}`}>
              <AgentMark agent={event.actor} size={34} />
              <div>
                <p><strong>{agentName(t, event.actor)}</strong> <time dateTime={event.at}>{when.format(new Date(event.at))}</time></p>
                <p>{t.trace.events[event.type]?.(event.detail) ?? event.type}</p>
                {event.type === "published" && event.detail.permalink && <a className="trace__link" href={String(event.detail.permalink)} target="_blank" rel="noreferrer">{t.piece.open}</a>}
                {(event.detail.backfilled || event.traceId) && <small>{event.detail.backfilled ? t.trace.backfilled : `${t.trace.traceId} ${event.traceId}`}</small>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
