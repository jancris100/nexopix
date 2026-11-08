import type { Metadata } from "next";
import { Logo } from "../../components/panel/Marks";
import { LanguageSwitch } from "../../i18n/client";
import { getDictionary } from "../../i18n/server";
import "./login.css";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).login.meta };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [{ error }, t] = await Promise.all([searchParams, getDictionary()]);
  return (
    <main className="login">
      <form className="login__card" method="post" action="/api/session">
        <Logo size={44} />
        <h1>{t.login.title}</h1>
        <label>
          {t.login.password}
          <input type="password" name="password" autoComplete="current-password" required autoFocus />
        </label>
        {error && <p className="login__error" role="alert">{t.login.wrong}</p>}
        <button type="submit">{t.login.submit}</button>
      </form>
      <LanguageSwitch className="login__lang" />
    </main>
  );
}
