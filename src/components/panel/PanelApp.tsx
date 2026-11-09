"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import { addAccount, addPublication, advance, decide, instagramPosts, postInsights, removeAccount, saveBrandKit, saveProfile, toggleAgent, toggleItem, weekAgenda } from "../../app/panel/actions";
import { useI18n } from "../../i18n/client";
import type { Dictionary } from "../../i18n/dictionaries";
import { addDays, costaRicaTime, mondayOf, monthLabel, shortDate, todayInCostaRica, weekNumber, weekRange } from "../../lib/dates";
import { FORMATS, type Format } from "../../lib/gatekeeper";
import { summaryFacts, trackedLink } from "../../lib/insights";
import type { Snapshot } from "../../lib/panel";
import { AGENT_TONES, AgentMark, Logo, NavIcon } from "./Marks";
import PieceSheet from "./PieceSheet";
import { AccountView, ProfileMenu } from "./Profile";

type View = "team" | "week" | "networks" | "results" | "account";
type Piece = Snapshot["pieces"][number];
type Account = Snapshot["accounts"][number];
type Agent = Snapshot["agents"][number];
type AgendaItem = Snapshot["agenda"][number];

/** The pipeline: one station per stage, with the agent that works there. Names and verbs come from the dictionary. */
const STATIONS = [
  { stage: 0, agent: "strategist" },
  { stage: 1, agent: "writer" },
  { stage: 2, agent: "human" },
  { stage: 3, agent: "scheduler" },
  { stage: 4, agent: "analyst" },
];
const REVIEW = 2;
const LAST_STAGE = 4;
const VIEWS = ["team", "week", "networks", "results"] as const;
const PROFILE_KEYS = ["voice", "offer", "audience", "neverPromise", "businessInfo"] as const;

const dayNumber = (date: string) => Number(date.slice(8));
const formatName = (t: Dictionary, format: string) => t.formats[format] ?? format;
const agentName = (t: Dictionary, id: string) => t.agents[id]?.name ?? id;

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
  const { t } = useI18n();
  const [snap, setSnap] = useState(initial);
  const [view, setView] = useState<View>("team");

  // Back from Meta: open the networks screen, where the result of the connection is shown.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("network")) setView("networks");
  }, []);
  const [day, setDay] = useState(snap.today);
  const [sheet, setSheet] = useState(false);
  const [failure, setFailure] = useState(false);
  const [busy, start] = useTransition();

  const run = (action: () => Promise<Snapshot>) =>
    start(async () => {
      try {
        setFailure(false);
        const next = await action();
        animate(() => setSnap(next));
      } catch {
        setFailure(true);
      }
    });

  const openView = (next: View) => view !== next && animate(() => setView(next), "page");
  const accountOf = (id: string) => snap.accounts.find((account) => account.id === id);
  const decisions = snap.approvals.length;

  return (
    <div className="np">
      <nav aria-label={t.panel.nav} className="np-rail">
        <Link href="/" className="np-rail__logo" aria-label={t.panel.home}>
          <Logo size={40} />
        </Link>
        {VIEWS.map((id) => (
          <button key={id} type="button" className={view === id ? "is-on" : ""} aria-current={view === id ? "page" : undefined} onClick={() => openView(id)}>
            <NavIcon name={id} />
            <span>{t.panel.tabs[id].label}</span>
            {id === "team" && decisions > 0 && <b aria-label={t.panel.toApprove(decisions)}>{decisions}</b>}
          </button>
        ))}
        <ProfileMenu snap={snap} className="pmenu--rail" onSettings={() => openView("account")} />
      </nav>

      <div className="np-page">
        <header className="np-top">
          <h1>{view === "account" ? t.account.title : t.panel.tabs[view].title}</h1>
          {snap.isTest && <p className="np-test">{t.panel.testDatabase}</p>}
          <button type="button" className="np-btn np-btn--go" onClick={() => setSheet(true)}>{t.panel.newRequest}</button>
          <ProfileMenu snap={snap} className="pmenu--top" onSettings={() => openView("account")} />
        </header>

        {failure && <p className="np-alert" role="alert">{t.panel.saveFailed}</p>}

        {view === "team" && <Team snap={snap} busy={busy} accountOf={accountOf} onAdvance={(id) => run(() => advance(id))} onDecide={(id, approved) => run(() => decide(id, approved))} onToggleAgent={(id) => run(() => toggleAgent(id))} onSnapshot={(next) => animate(() => setSnap(next))} />}

        {view === "week" && <Week snap={snap} busy={busy} day={day} onPickDay={setDay} accountOf={accountOf} onToggle={(id) => run(() => toggleItem(id))} />}

        {view === "networks" && <Networks snap={snap} busy={busy} onRemove={(id) => run(() => removeAccount(id))} onSaved={(next) => animate(() => setSnap(next))} />}

        {view === "results" && <Results snap={snap} accountOf={accountOf} />}

        {view === "account" && <AccountView snap={snap} onSaved={(next) => setSnap(next)} onBack={() => openView("team")} />}
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

/** Weeks ahead that can already be planned. */
const WEEKS_AHEAD = 8;

/** The week as a control of publications: pick any week from the first one, or read the whole record. */
function Week({ snap, busy, day, onPickDay, accountOf, onToggle }: {
  snap: Snapshot;
  busy: boolean;
  day: string;
  onPickDay: (date: string) => void;
  accountOf: (id: string) => Account | undefined;
  onToggle: (id: number) => void;
}) {
  const { t, locale } = useI18n();
  const [mode, setMode] = useState<"calendar" | "history">("calendar");
  const [week, setWeek] = useState(snap.weekStart);
  const [items, setItems] = useState<AgendaItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const isCurrent = week === snap.weekStart;

  // Another week is read on demand, and read again after every change so a ticked slot stays ticked.
  useEffect(() => {
    if (isCurrent) return;
    let live = true;
    setLoading(true);
    weekAgenda(week)
      .then((rows) => live && setItems(rows))
      .catch(() => live && setItems([]))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [week, isCurrent, snap]);

  const lastWeek = addDays(snap.weekStart, WEEKS_AHEAD * 7);
  const weeks: string[] = [];
  for (let monday = snap.firstWeek; monday <= lastWeek; monday = addDays(monday, 7)) weeks.push(monday);
  const go = (monday: string) => {
    if (monday < snap.firstWeek || monday > lastWeek) return;
    animate(() => {
      setWeek(monday);
      setItems(null);
      onPickDay(monday === snap.weekStart ? snap.today : monday);
    }, "page");
  };
  const shown = isCurrent ? snap.agenda : items ?? [];
  const done = shown.filter((item) => item.done).length;

  return (
    <section aria-label={t.week.label} className="np-rows">
      <div className="weekbar">
        <div className="np-seg" role="group" aria-label={t.week.view}>
          <button type="button" aria-pressed={mode === "calendar"} className={mode === "calendar" ? "is-on" : ""} onClick={() => animate(() => setMode("calendar"), "page")}>{t.week.calendar}</button>
          <button type="button" aria-pressed={mode === "history"} className={mode === "history" ? "is-on" : ""} onClick={() => animate(() => setMode("history"), "page")}>{t.week.history}</button>
        </div>
        {mode === "calendar" && (
          <div className="weekbar__pick">
            <button type="button" className="np-btn weekbar__step" aria-label={t.week.previous} disabled={week <= snap.firstWeek} onClick={() => go(addDays(week, -7))}>‹</button>
            <select aria-label={t.week.label} value={week} onChange={(event) => go(event.target.value)}>
              {weeks.map((monday) => <option key={monday} value={monday}>{t.week.option(weekNumber(snap.firstWeek, monday), weekRange(monday, locale), monday === snap.weekStart)}</option>)}
            </select>
            <button type="button" className="np-btn weekbar__step" aria-label={t.week.next} disabled={week >= lastWeek} onClick={() => go(addDays(week, 7))}>›</button>
            {!isCurrent && <button type="button" className="np-btn" onClick={() => go(snap.weekStart)}>{t.week.thisWeek}</button>}
          </div>
        )}
      </div>

      {mode === "calendar" && (
        <>
          <p className="np-note" aria-live="polite">
            {loading ? t.week.loading : shown.length === 0 ? t.week.empty : t.week.done(done, shown.length)}
          </p>
          {Array.from({ length: 7 }, (_, index) => addDays(week, index)).map((date, index) => {
            const dayItems = shown.filter((item) => item.scheduledOn === date);
            return (
              <article key={date} className={`day${date === snap.today ? " is-today" : ""}`}>
                <button type="button" className={`day__date${date === day ? " is-picked" : ""}`} aria-pressed={date === day} onClick={() => onPickDay(date)}>
                  <strong>{dayNumber(date)}</strong>
                  <span>{t.days[index]}</span>
                </button>
                <div className="day__items">
                  {dayItems.length === 0 && <p className="np-note">{t.week.noPosts}</p>}
                  {dayItems.map((item) => (
                    <button key={item.id} type="button" className={`slot${item.done ? " is-done" : ""}`} aria-pressed={item.done} disabled={busy} onClick={() => onToggle(item.id)}>
                      <strong>{item.title}</strong>
                      <small>{t.week.slot(item.time, formatName(t, item.format), accountOf(item.accountId)?.handle ?? t.common.deletedAccount)}</small>
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </>
      )}

      {mode === "history" && <History snap={snap} busy={busy} accountOf={accountOf} onToggle={onToggle} />}
    </section>
  );
}

type Post = Awaited<ReturnType<typeof instagramPosts>>["posts"][number];
type Problem = Awaited<ReturnType<typeof instagramPosts>>["problems"][number];
type Entry = {
  key: string;
  date: string;
  time: string;
  title: string;
  kind: string;
  accountId: string;
  state: "done" | "missed" | "due";
  item?: AgendaItem;
  post?: Post;
};

const firstLine = (caption: string) => caption.split("\n").find((line) => line.trim())?.trim() ?? "";

/** Everything planned in Nexopix and everything already on Instagram, by week, filtered by month and account. */
function History({ snap, busy, accountOf, onToggle }: { snap: Snapshot; busy: boolean; accountOf: (id: string) => Account | undefined; onToggle: (id: number) => void }) {
  const { t, locale } = useI18n();
  const [accountId, setAccountId] = useState("all");
  const [month, setMonth] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const [remote, setRemote] = useState<{ posts: Post[]; problems: Problem[]; failed?: boolean } | null>(null);
  const hasInstagram = snap.accounts.some((account) => account.network === "instagram" && account.linked);

  useEffect(() => {
    if (!hasInstagram) return;
    let live = true;
    instagramPosts()
      .then((result) => live && setRemote(result))
      .catch(() => live && setRemote({ posts: [], problems: [], failed: true }));
    return () => {
      live = false;
    };
  }, [hasInstagram]);

  const entries: Entry[] = [
    ...snap.history.map((item) => ({
      key: `plan-${item.id}`,
      date: item.scheduledOn,
      time: item.time,
      title: item.title,
      kind: formatName(t, item.format),
      accountId: item.accountId,
      state: (item.done ? "done" : item.scheduledOn < snap.today ? "missed" : "due") as Entry["state"],
      item,
    })),
    ...(remote?.posts ?? []).map((post) => ({
      key: `ig-${post.id}`,
      date: todayInCostaRica(new Date(post.timestamp)),
      time: costaRicaTime(new Date(post.timestamp)),
      title: firstLine(post.caption) || t.history.noText,
      kind: t.postKinds[post.kind] ?? post.kind,
      accountId: post.accountId,
      state: "done" as const,
      post,
    })),
  ].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));

  const months = [...new Set(entries.map((entry) => entry.date.slice(0, 7)))];
  const rows = entries.filter((entry) => (accountId === "all" || entry.accountId === accountId) && (month === "all" || entry.date.startsWith(month)));
  const groups = new Map<string, Entry[]>();
  for (const entry of rows) {
    const monday = mondayOf(entry.date);
    groups.set(monday, [...(groups.get(monday) ?? []), entry]);
  }
  const weekName = (monday: string) => (monday >= snap.firstWeek ? t.history.week(weekNumber(snap.firstWeek, monday)) : t.history.before);
  const opened = entries.find((entry) => entry.key === open);

  return (
    <>
      <div className="history__filters">
        <label className="history__filter">
          {t.history.month}
          <select value={month} onChange={(event) => setMonth(event.target.value)}>
            <option value="all">{t.common.allMonths}</option>
            {months.map((value) => <option key={value} value={value}>{monthLabel(value, locale)}</option>)}
          </select>
        </label>
        {snap.accounts.length > 1 && (
          <label className="history__filter">
            {t.history.account}
            <select value={accountId} onChange={(event) => setAccountId(event.target.value)}>
              <option value="all">{t.common.all}</option>
              {snap.accounts.map((account) => <option key={account.id} value={account.id}>{account.handle}</option>)}
            </select>
          </label>
        )}
      </div>
      {hasInstagram && !remote && <p className="np-note" aria-live="polite">{t.history.reading}</p>}
      {remote?.failed && <p className="np-alert" role="alert">{t.history.readFailed}</p>}
      {remote?.problems.map((problem) => <p key={problem.handle} className="np-alert" role="alert">{t.history.problems[problem.kind](problem.handle)}</p>)}
      {groups.size === 0 && (remote || !hasInstagram) && <p className="np-note">{entries.length === 0 ? t.history.empty : t.history.filtered}</p>}
      {[...groups.entries()].map(([monday, list]) => (
        <section key={monday} className="group" aria-label={weekName(monday)}>
          <h2 className="history__week">
            {weekName(monday)}
            <small>{t.history.weekSummary(weekRange(monday, locale), list.filter((entry) => entry.state === "done").length, list.length)}</small>
          </h2>
          {list.map((entry) => (
            <button key={entry.key} type="button" className="history__row" onClick={() => setOpen(entry.key)}>
              <span className="history__date">{shortDate(entry.date, locale)}<small>{entry.time}</small></span>
              <span className="history__main">
                {entry.post && <PostThumb post={entry.post} size={44} />}
                <span className="piece__text">
                  <strong>{entry.title}</strong>
                  <small>
                    {t.team.pieceOn(entry.kind, accountOf(entry.accountId)?.handle ?? t.common.deletedAccount)}
                    {entry.post && entry.post.likes !== null && t.history.counts(entry.post.likes, entry.post.comments ?? 0)}
                  </small>
                </span>
              </span>
              <span className={`history__state is-${entry.state}`}>{entry.post ? t.history.onInstagram : t.history.states[entry.state]}</span>
            </button>
          ))}
        </section>
      ))}
      {opened && (
        <PostDetail
          entry={opened}
          account={accountOf(opened.accountId)}
          busy={busy}
          onClose={() => setOpen(null)}
          onToggle={(id) => {
            onToggle(id);
            setOpen(null);
          }}
        />
      )}
    </>
  );
}

function PostThumb({ post, size }: { post: Post; size: number }) {
  const source = post.thumbnailUrl ?? post.mediaUrl;
  if (!source) return <span className="thumb thumb--empty" style={{ width: size, height: size }} aria-hidden="true" />;
  // eslint-disable-next-line @next/next/no-img-element -- Instagram's image addresses change and expire; they are shown as they come.
  return <img className="thumb" src={source} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer" />;
}

/** One publication opened: what it said, where and when, and the numbers Instagram gives for it. */
function PostDetail({ entry, account, busy, onClose, onToggle }: { entry: Entry; account?: Account; busy: boolean; onClose: () => void; onToggle: (id: number) => void }) {
  const { t, locale } = useI18n();
  const [insights, setInsights] = useState<Awaited<ReturnType<typeof postInsights>> | null>(null);
  const post = entry.post;

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  useEffect(() => {
    if (!post) return;
    let live = true;
    postInsights(post.accountId, post.id)
      .then((result) => live && setInsights(result))
      .catch(() => live && setInsights({ insights: null, reason: "unavailable" }));
    return () => {
      live = false;
    };
  }, [post]);

  const numbers: [string, number | null | undefined][] = post
    ? [
        [t.detail.numbers.likes, post.likes],
        [t.detail.numbers.comments, post.comments],
        [t.detail.numbers.views, insights?.insights?.views],
        [t.detail.numbers.reach, insights?.insights?.reach],
        [t.detail.numbers.saved, insights?.insights?.saved],
        [t.detail.numbers.shares, insights?.insights?.shares],
      ]
    : [];

  return (
    <div className="np-scrim" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-label={t.detail.label} className="sheet detail">
        <div className="sheet__head detail__head">
          <div>
            <h2>{post ? t.detail.instagram : t.detail.planned}</h2>
            <p>{t.detail.where(entry.kind, account?.handle ?? t.common.deletedAccount, shortDate(entry.date, locale), entry.time)}</p>
          </div>
          <button type="button" className="sheet__close" aria-label={t.common.close} onClick={onClose} autoFocus>×</button>
        </div>

        {post && (post.mediaUrl || post.thumbnailUrl) && (
          // eslint-disable-next-line @next/next/no-img-element -- see PostThumb.
          <img className="detail__media" src={post.mediaUrl ?? post.thumbnailUrl ?? ""} alt={firstLine(post.caption) || t.detail.alt} referrerPolicy="no-referrer" />
        )}

        {post ? (
          <p className="detail__caption">{post.caption || t.detail.noText}</p>
        ) : (
          <div className="detail__plan">
            <strong>{entry.title}</strong>
            <p className={`history__state is-${entry.state}`}>{t.history.states[entry.state]}</p>
          </div>
        )}

        {post && (
          <>
            <dl className="detail__numbers">
              {numbers.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{typeof value === "number" ? value.toLocaleString(t.locale) : insights ? t.detail.unavailable : "…"}</dd>
                </div>
              ))}
            </dl>
            {insights?.reason === "permission" && <p className="np-note">{t.detail.needsPermission}</p>}
            {post.permalink && <a className="np-btn np-btn--wide" href={post.permalink} target="_blank" rel="noreferrer">{t.detail.open}</a>}
          </>
        )}

        {entry.item && (
          <>
            <p className="np-note">{t.detail.later}</p>
            <button type="button" className="np-btn np-btn--go np-btn--wide" disabled={busy} onClick={() => onToggle(entry.item!.id)}>
              {entry.item.done ? t.detail.markUnpublished : t.detail.markPublished}
            </button>
          </>
        )}
      </section>
    </div>
  );
}

/** The team in one line: each agent at its station, the person among them, with what each one holds. */
function Lineup({ snap, focus, onFocus }: { snap: Snapshot; focus: string | null; onFocus: (id: string | null) => void }) {
  const { t } = useI18n();
  const moving = snap.pieces.filter((piece) => piece.stage < LAST_STAGE).length;
  const crew = [
    { id: "router", stage: t.team.entry, count: moving, line: moving === 0 ? t.team.idle : t.team.distributes(moving) },
    ...STATIONS.map((station) => {
      const count = snap.pieces.filter((piece) => piece.stage === station.stage).length;
      const human = station.agent === "human";
      return {
        id: station.agent,
        stage: t.stages[station.stage],
        count,
        line: human ? (count === 0 ? t.team.nothingToApprove : t.panel.toApprove(count)) : count === 0 ? t.team.idle : t.team.working(t.stageVerbs[station.stage], count),
      };
    }),
  ];
  return (
    <section aria-label={t.team.agents} className="lineup">
      <span className="lineup__flow" aria-hidden="true" />
      {crew.map((member) => {
        const agent = snap.agents.find((item) => item.id === member.id);
        const off = agent ? !agent.active : false;
        return (
          <button
            key={member.id}
            type="button"
            className={`station${member.id === "human" ? " station--human" : ""}${off ? " is-off" : member.count > 0 ? " is-busy" : ""}${focus === member.id ? " is-on" : ""}`}
            aria-pressed={focus === member.id}
            style={{ "--tone": AGENT_TONES[member.id]?.strong } as CSSProperties}
            onClick={() => onFocus(focus === member.id ? null : member.id)}
          >
            <span className="station__mark">
              <AgentMark agent={member.id} size={52} />
              {!off && member.count > 0 && <b>{member.count}</b>}
            </span>
            <strong>{agentName(t, member.id)}</strong>
            <small>{off ? t.team.off : member.line}</small>
            <span className="station__stage">{member.stage}</span>
          </button>
        );
      })}
    </section>
  );
}

function Team({ snap, busy, accountOf, onAdvance, onDecide, onToggleAgent, onSnapshot }: { snap: Snapshot; busy: boolean; accountOf: (id: string) => Account | undefined; onAdvance: (id: number) => void; onDecide: (id: number, approved: boolean) => void; onToggleAgent: (id: string) => void; onSnapshot: (next: Snapshot) => void }) {
  const { t } = useI18n();
  const [focus, setFocus] = useState<string | null>(null);
  const [traced, setTraced] = useState<Piece | null>(null);
  const agentOf = (id: string) => snap.agents.find((agent) => agent.id === id);
  const focusAgent: Agent | undefined = focus ? agentOf(focus) : undefined;
  const station = STATIONS.find((item) => item.agent === focus);
  const shown = station ? snap.pieces.filter((piece) => piece.stage === station.stage) : snap.pieces;

  const groups = [
    { id: "decide", title: t.team.groups.decide, items: shown.filter((piece) => piece.stage === REVIEW) },
    { id: "moving", title: t.team.groups.moving, items: shown.filter((piece) => piece.stage !== REVIEW && piece.stage < LAST_STAGE) },
    { id: "done", title: t.team.groups.done, items: shown.filter((piece) => piece.stage === LAST_STAGE) },
  ];

  const row = (piece: Piece) => {
    const approval = snap.approvals.find((item) => item.pieceId === piece.id);
    const place = STATIONS[piece.stage];
    const agent = agentOf(place.agent);
    return (
      <article key={piece.id} className={`piece${piece.stage === REVIEW ? " piece--human" : ""}`} style={{ viewTransitionName: `piece-${piece.id}` }}>
        <AgentMark agent={place.agent} size={40} />
        <button type="button" className="piece__text piece__open" aria-label={t.trace.open(piece.title)} onClick={() => setTraced(piece)}>
          <strong>{piece.title}</strong>
          <small>{t.team.pieceOn(formatName(t, piece.format), accountOf(piece.accountId)?.handle ?? t.common.deletedAccount)}</small>
        </button>
        <div className="piece__track" aria-label={t.team.stage(t.stages[piece.stage])}>
          <span className="piece__dots" aria-hidden="true">
            {STATIONS.map((item) => <i key={item.stage} className={item.stage < piece.stage ? "is-past" : item.stage === piece.stage ? "is-now" : ""} />)}
          </span>
          <small>{t.stages[piece.stage]}</small>
        </div>
        <div className="piece__act">
          {piece.stage === REVIEW && approval ? (
            <>
              <button type="button" className="np-btn" disabled={busy} onClick={() => onDecide(approval.id, false)}>{t.team.reject}</button>
              <button type="button" className="np-btn np-btn--human" disabled={busy} onClick={() => onDecide(approval.id, true)}>{t.team.approve}</button>
            </>
          ) : piece.stage < LAST_STAGE ? (
            <button type="button" className="np-btn" disabled={busy || agent?.active === false} onClick={() => onAdvance(piece.id)}>
              {agent?.active === false ? t.team.agentOff(agentName(t, agent.id)) : t.team.moveTo(t.stages[piece.stage + 1])}
            </button>
          ) : (
            <span className="piece__done">{t.team.published}</span>
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
          <p><strong>{agentName(t, focusAgent.id)}.</strong> {t.agents[focusAgent.id]?.job ?? focusAgent.job}.</p>
          <button type="button" role="switch" aria-checked={focusAgent.active} className={`np-switch${focusAgent.active ? " is-on" : ""}`} disabled={busy} onClick={() => onToggleAgent(focusAgent.id)}>
            <span><i /></span>
            {focusAgent.active ? t.team.on : t.team.off}
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
        {shown.length === 0 && <p className="np-note">{focus ? t.team.agentEmpty : t.team.empty}</p>}
      </div>
      <p className="np-note np-rule">{t.team.rule}</p>
      {traced && (
        <PieceSheet
          key={traced.id}
          pieceId={traced.id}
          snapshotPiece={snap.pieces.find((piece) => piece.id === traced.id) ?? traced}
          approvalId={snap.approvals.find((item) => item.pieceId === traced.id)?.id}
          onClose={() => setTraced(null)}
          onSnapshot={onSnapshot}
        />
      )}
    </>
  );
}

function Networks({ snap, busy, onRemove, onSaved }: { snap: Snapshot; busy: boolean; onRemove: (id: string) => void; onSaved: (snapshot: Snapshot) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("network");
    if (code) {
      setNotice(code);
      window.history.replaceState(null, "", "/panel");
    }
  }, []);

  const message = notice ? t.networks.notices[notice] : null;
  return (
    <section aria-label={t.networks.label} className="np-rows">
      {message && <p className={`np-notice np-notice--${notice === "connected" ? "ok" : "warn"}`} role="status">{message}</p>}
      <div className="nets-head">
        <p className="np-note">{snap.accounts.length === 0 ? t.networks.none : t.networks.count(snap.accounts.length)}</p>
        <button type="button" className="np-btn np-btn--go" onClick={() => setAdding(true)}>{t.networks.add}</button>
      </div>
      {snap.accounts.length === 0 && (
        <div className="empty">
          <h2>{t.networks.emptyTitle}</h2>
          <p>{t.networks.emptyText}</p>
          <button type="button" className="np-btn np-btn--go" onClick={() => setAdding(true)}>{t.networks.add}</button>
        </div>
      )}
      {snap.accounts.map((account) => {
        const complete = PROFILE_KEYS.every((key) => account[key].trim());
        const expanded = open === account.id;
        const details = [
          t.networkNames[account.network] ?? account.network,
          account.linked ? t.networks.connected : t.networks.notConnected,
          account.followers != null ? t.networks.followers(account.followers.toLocaleString(t.locale)) : null,
        ];
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
                <small>{details.filter(Boolean).join(", ")}</small>
              </div>
              <p className="net__stat"><b>{snap.agenda.filter((item) => item.accountId === account.id).length}</b> {t.networks.thisWeek}</p>
              <p className={`net__flag${complete ? " is-ok" : ""}`}>{complete ? t.networks.profileReady : t.networks.profileMissing}</p>
              <div className="net__act">
                <button type="button" className="np-btn" aria-expanded={expanded} onClick={() => animate(() => setOpen(expanded ? null : account.id))}>{expanded ? t.networks.closeProfile : t.networks.openProfile}</button>
                {!account.linked && account.network === "instagram" && <a className="np-btn np-btn--go" href={`/api/meta/connect?account=${encodeURIComponent(account.id)}`}>{t.networks.connect}</a>}
                <button type="button" className="np-btn" disabled={busy} onClick={() => onRemove(account.id)}>{account.linked ? t.networks.disconnect : t.networks.remove}</button>
              </div>
            </div>
            {expanded && (
              <>
                <Profile account={account} onSaved={onSaved} />
                <BrandKitForm account={account} onSaved={onSaved} />
              </>
            )}
          </article>
        );
      })}
      {adding && <AddNetwork canConnect={snap.canConnect} onClose={() => setAdding(false)} onSaved={(next) => { setAdding(false); onSaved(next); }} />}
    </section>
  );
}

function AddNetwork({ canConnect, onClose, onSaved }: { canConnect: boolean; onClose: () => void; onSaved: (snapshot: Snapshot) => void }) {
  const { t } = useI18n();
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
        else setError(result.error ?? t.addNetwork.failed);
      } catch {
        setError(`${t.addNetwork.failed} ${t.common.retry}`);
      }
    });
  };

  return (
    <div className="np-scrim">
      <form role="dialog" aria-modal="true" aria-label={t.addNetwork.title} className="sheet" onSubmit={submit}>
        <div className="sheet__head">
          <AgentMark agent="router" size={44} />
          <div>
            <h2>{t.addNetwork.title}</h2>
            <p>{t.addNetwork.lead}</p>
          </div>
          <button type="button" className="sheet__close" aria-label={t.common.close} onClick={onClose}>×</button>
        </div>
        <a className={`connect${canConnect ? "" : " is-off"}`} href="/api/meta/connect" aria-disabled={!canConnect}>
          <span className="net__tile net__tile--instagram" aria-hidden="true">I</span>
          <span>
            <strong>{t.addNetwork.connect}</strong>
            <small>{canConnect ? t.addNetwork.connectReady : t.addNetwork.connectOff}</small>
          </span>
        </a>
        <p className="sheet__or">{t.addNetwork.or}</p>
        <fieldset>
          <legend>{t.addNetwork.network}</legend>
          <div className="choices">
            {[["instagram", "Instagram"], ["facebook", t.addNetwork.facebookPage]].map(([id, label]) => (
              <button key={id} type="button" className={network === id ? "is-on" : ""} aria-pressed={network === id} onClick={() => setNetwork(id)}>{label}</button>
            ))}
          </div>
        </fieldset>
        <label>
          {network === "instagram" ? t.addNetwork.instagramUser : t.addNetwork.pageName}
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder={network === "instagram" ? t.addNetwork.placeholder : ""} autoComplete="off" />
        </label>
        <label>
          {t.addNetwork.brand}
          <input value={brand} onChange={(event) => setBrand(event.target.value)} maxLength={80} />
        </label>
        {error && <p className="np-alert" role="alert">{error}</p>}
        <button type="submit" className="np-btn np-btn--wide" disabled={saving}>{t.addNetwork.submit}</button>
      </form>
    </div>
  );
}

function Profile({ account, onSaved }: { account: Account; onSaved: (snapshot: Snapshot) => void }) {
  const { t } = useI18n();
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
          setNotice(t.profile.saved);
        } else {
          setNotice(result.error ?? t.profile.failed);
        }
      } catch {
        setNotice(`${t.profile.failed} ${t.common.retry}`);
      }
    });
  };
  return (
    <form className="profile" onSubmit={submit}>
      <p className="np-note">{t.profile.lead}</p>
      <label className="profile__wide">
        {t.profile.website}
        <input value={values.website} onChange={set("website")} maxLength={200} inputMode="url" />
      </label>
      {PROFILE_KEYS.map((key) => (
        <label key={key}>
          {t.profile.fields[key]}
          <textarea value={values[key]} onChange={set(key)} rows={2} maxLength={key === "businessInfo" ? 1000 : 400} />
        </label>
      ))}
      <div className="profile__foot">
        <button type="submit" className="np-btn np-btn--go" disabled={saving}>{t.profile.save}</button>
        {notice && <p role="status">{notice}</p>}
      </div>
    </form>
  );
}

/** Logo, colors and default template of an account: what the templates draw with. */
function BrandKitForm({ account, onSaved }: { account: Account; onSaved: (snapshot: Snapshot) => void }) {
  const { t } = useI18n();
  const [values, setValues] = useState({
    logoUrl: account.logoUrl ?? "",
    brandColor: account.brandColor ?? "#14161A",
    accentColor: account.accentColor ?? "#3FBF9A",
    defaultTemplate: account.defaultTemplate ?? "",
  });
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const set = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setNotice(null);
    setValues((current) => ({ ...current, [key]: event.target.value }));
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    start(async () => {
      try {
        const result = await saveBrandKit(account.id, { ...values, defaultTemplate: values.defaultTemplate || null, logoUrl: values.logoUrl || null });
        if (result.snapshot) {
          onSaved(result.snapshot);
          setNotice(t.brandKit.saved);
        } else {
          setNotice(result.error ?? t.profile.failed);
        }
      } catch {
        setNotice(`${t.profile.failed} ${t.common.retry}`);
      }
    });
  };
  return (
    <form className="profile brandkit" onSubmit={submit}>
      <div className="profile__wide">
        <strong>{t.brandKit.title}</strong>
        <p className="np-note">{t.brandKit.lead}</p>
      </div>
      <label className="profile__wide">
        {t.brandKit.logo}
        <span className="brandkit__logo">
          {/* eslint-disable-next-line @next/next/no-img-element -- the address the person typed, shown as it is. */}
          {values.logoUrl.startsWith("https://") && <img src={values.logoUrl} alt="" referrerPolicy="no-referrer" />}
          <input value={values.logoUrl} onChange={set("logoUrl")} maxLength={500} inputMode="url" placeholder="https://" />
        </span>
      </label>
      <label>
        {t.brandKit.color}
        <span className="brandkit__color"><input type="color" value={values.brandColor} onChange={set("brandColor")} /><code>{values.brandColor.toUpperCase()}</code></span>
      </label>
      <label>
        {t.brandKit.accent}
        <span className="brandkit__color"><input type="color" value={values.accentColor} onChange={set("accentColor")} /><code>{values.accentColor.toUpperCase()}</code></span>
      </label>
      <label className="profile__wide">
        {t.brandKit.template}
        <select value={values.defaultTemplate} onChange={set("defaultTemplate")}>
          <option value="">{t.brandKit.none}</option>
          {Object.keys(t.templates).map((id) => <option key={id} value={id}>{t.templates[id]}</option>)}
        </select>
      </label>
      <div className="profile__foot">
        <button type="submit" className="np-btn np-btn--go" disabled={saving}>{t.brandKit.save}</button>
        {notice && <p role="status">{notice}</p>}
      </div>
    </form>
  );
}

function Results({ snap, accountOf }: { snap: Snapshot; accountOf: (id: string) => Account | undefined }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState<number | null>(null);
  const pendingToday = snap.agenda.filter((item) => item.scheduledOn === snap.today && !item.done).length;
  const facts = summaryFacts(snap.pieces, snap.results, pendingToday);
  const summary = [
    t.results.summary.published(facts.published, facts.clicks, facts.leads),
    facts.best ? t.results.summary.best(facts.best) : t.results.summary.noBest,
    t.results.summary.toApprove(facts.toApprove),
    t.results.summary.today(facts.pendingToday),
  ];
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
    <section aria-label={t.results.label} className="np-rows">
      <div className="summary">
        <AgentMark agent="analyst" size={64} />
        <div>
          <h2>{t.results.today}</h2>
          <ul>{summary.map((line) => <li key={line}>{line}</li>)}</ul>
        </div>
      </div>
      <section aria-label={t.results.byPiece} className="group">
        <h2>{t.results.byPiece}</h2>
        {rows.map(({ piece, clicks, leads, pieceId }) => {
          const owner = accountOf(piece!.accountId);
          const link = owner ? trackedLink(owner.website, owner.network, piece!) : null;
          return (
            <article key={pieceId} className="result">
              <div className="piece__text">
                <strong>{piece!.title}</strong>
                <small>{owner?.handle}</small>
              </div>
              <p className="result__bar" aria-label={t.results.leads(leads)}><span style={{ width: `${(leads / top) * 100}%` }} /><b>{leads}</b></p>
              <p className="result__clicks"><b>{clicks}</b> {t.results.clicks}</p>
              {link && <button type="button" className="np-btn" onClick={() => copy(pieceId, link)}>{copied === pieceId ? t.results.copied : t.results.copy}</button>}
            </article>
          );
        })}
        {rows.length === 0 && <p className="np-note">{t.results.empty}</p>}
      </section>
      <p className="np-note">{t.results.source}</p>
    </section>
  );
}

function NewRequest({ snap, date, onClose, onSaved }: { snap: Snapshot; date: string; onClose: () => void; onSaved: (snapshot: Snapshot) => void }) {
  const { t } = useI18n();
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
        else setError(result.error ?? t.request.failed);
      } catch {
        setError(`${t.request.failed} ${t.common.retry}`);
      }
    });
  };

  const lane = t.lanes[FORMATS[format].pipeline];
  const weekday = t.days[(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7];

  return (
    <div className="np-scrim">
      <form role="dialog" aria-modal="true" aria-label={t.request.title} className="sheet" onSubmit={submit}>
        <div className="sheet__head">
          <AgentMark agent="router" size={44} />
          <div>
            <h2>{t.request.title}</h2>
            <p>{t.request.lead(lane, weekday, dayNumber(date))}</p>
          </div>
          <button type="button" className="sheet__close" aria-label={t.common.close} onClick={onClose}>×</button>
        </div>
        <label>
          {t.request.what}
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} autoFocus />
        </label>
        <fieldset>
          <legend>{t.request.format}</legend>
          <div className="choices">
            {(Object.keys(FORMATS) as Format[]).map((key) => (
              <button key={key} type="button" className={format === key ? "is-on" : ""} aria-pressed={format === key} onClick={() => setFormat(key)}>{formatName(t, key)}</button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>{t.request.account}</legend>
          <div className="choices">
            {snap.accounts.map((account) => (
              <button key={account.id} type="button" className={accountId === account.id ? "is-on" : ""} aria-pressed={accountId === account.id} onClick={() => setAccountId(account.id)}>{account.handle}</button>
            ))}
          </div>
        </fieldset>
        {error && <p className="np-alert" role="alert">{error}</p>}
        {snap.accounts.length === 0 && <p className="np-alert" role="alert">{t.request.noAccounts}</p>}
        <button type="submit" className="np-btn np-btn--go np-btn--wide" disabled={saving || snap.accounts.length === 0}>{t.request.submit}</button>
      </form>
    </div>
  );
}
