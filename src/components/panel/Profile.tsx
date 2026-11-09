"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { saveOwner } from "../../app/panel/actions";
import { LanguageSwitch, useI18n } from "../../i18n/client";
import type { Snapshot } from "../../lib/panel";

/** Two letters for the avatar: the owner's initials, or the business, or N for Nexopix. */
export function initials(owner: Snapshot["owner"]) {
  const words = (owner.name || owner.company).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "N";
  return (words.length === 1 ? words[0].slice(0, 2) : `${words[0][0]}${words[words.length - 1][0]}`).toUpperCase();
}

export function Avatar({ owner, size = 36 }: { owner: Snapshot["owner"]; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {initials(owner)}
    </span>
  );
}

/** The avatar button and its menu: who is in, settings, language, the API docs and log out. */
export function ProfileMenu({ snap, onSettings, className }: { snap: Snapshot; onSettings: () => void; className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => box.current && !box.current.contains(event.target as Node) && setOpen(false);
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const logout = async () => {
    setLeaving(true);
    await fetch("/api/session", { method: "DELETE" }).catch(() => null);
    window.location.href = "/login";
  };

  const name = snap.owner.name || snap.owner.company || t.menu.noName;
  return (
    <div className={`pmenu${className ? ` ${className}` : ""}`} ref={box}>
      <button type="button" className="pmenu__button" aria-label={t.menu.open} aria-haspopup="true" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((value) => !value)}>
        <Avatar owner={snap.owner} />
      </button>
      {open && (
        <div className="pmenu__panel" id={menuId} role="menu">
          <div className="pmenu__who">
            <Avatar owner={snap.owner} size={44} />
            <div>
              <strong>{name}</strong>
              <small>{snap.owner.email || t.menu.owner}</small>
            </div>
          </div>
          <button type="button" role="menuitem" className="pmenu__item" onClick={() => { setOpen(false); onSettings(); }}>
            {t.menu.settings}
          </button>
          <div className="pmenu__row">
            <span>{t.menu.language}</span>
            <LanguageSwitch />
          </div>
          <Link role="menuitem" className="pmenu__item" href="/docs">{t.menu.docs}</Link>
          {snap.isProtected && (
            <button type="button" role="menuitem" className="pmenu__item pmenu__item--out" disabled={leaving} onClick={logout}>
              {leaving ? t.menu.loggingOut : t.menu.logout}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Profile and settings: the owner's details, the language and what the server has configured. */
export function AccountView({ snap, onSaved, onBack }: { snap: Snapshot; onSaved: (next: Snapshot) => void; onBack: () => void }) {
  const { t } = useI18n();
  const [values, setValues] = useState(snap.owner);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, start] = useTransition();
  const set = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setNotice(null);
    setValues((current) => ({ ...current, [key]: event.target.value }));
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    start(async () => {
      try {
        const result = await saveOwner(values);
        if (result.snapshot) {
          onSaved(result.snapshot);
          setNotice({ ok: true, text: t.account.saved });
        } else {
          setNotice({ ok: false, text: result.error ?? t.account.failed });
        }
      } catch {
        setNotice({ ok: false, text: `${t.account.failed} ${t.common.retry}` });
      }
    });
  };
  const checks = (Object.keys(snap.setup) as (keyof Snapshot["setup"])[]).map((key) => ({ key, label: t.account.setup[key], ok: snap.setup[key] }));

  return (
    <div className="np-rows account">
      <button type="button" className="np-btn account__back" onClick={onBack}>‹ {t.account.back}</button>

      <section className="account__card" aria-labelledby="account-profile">
        <div className="account__head">
          <Avatar owner={values} size={56} />
          <div>
            <h2 id="account-profile">{t.account.profileTitle}</h2>
            <p className="np-note">{t.account.profileLead}</p>
          </div>
        </div>
        <form className="account__form" onSubmit={submit}>
          <label>
            {t.account.name}
            <input value={values.name} onChange={set("name")} maxLength={80} autoComplete="name" />
          </label>
          <label>
            {t.account.email}
            <input value={values.email} onChange={set("email")} maxLength={120} type="email" inputMode="email" autoComplete="email" />
          </label>
          <label>
            {t.account.company}
            <input value={values.company} onChange={set("company")} maxLength={80} autoComplete="organization" />
          </label>
          <div className="account__foot">
            <button type="submit" className="np-btn np-btn--go" disabled={saving}>{t.account.save}</button>
            {notice && <p role="status" className={notice.ok ? "is-ok" : "is-bad"}>{notice.text}</p>}
          </div>
        </form>
      </section>

      <section className="account__card" aria-labelledby="account-language">
        <div className="account__line">
          <div>
            <h2 id="account-language">{t.account.languageTitle}</h2>
            <p className="np-note">{t.account.languageLead}</p>
          </div>
          <LanguageSwitch />
        </div>
      </section>

      <section className="account__card" aria-labelledby="account-setup">
        <h2 id="account-setup">{t.account.setupTitle}</h2>
        <p className="np-note">{t.account.setupLead}</p>
        <ul className="account__checks">
          {checks.map((check) => (
            <li key={check.key}>
              <span>{check.label}</span>
              <b className={check.ok ? "is-ok" : "is-bad"}>{check.ok ? t.account.ready : t.account.missing}</b>
            </li>
          ))}
        </ul>
      </section>

      <section className="account__card" aria-labelledby="account-session">
        <h2 id="account-session">{t.account.sessionTitle}</h2>
        <p className="np-note">{snap.isProtected ? t.account.sessionOn : t.account.sessionOff}</p>
      </section>
    </div>
  );
}
