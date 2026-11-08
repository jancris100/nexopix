import type { Metadata } from "next";
import { Logo } from "../../components/panel/Marks";
import "./entrar.css";

export const metadata: Metadata = { title: "Entrar a Nexopix" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login">
      <form className="login__card" method="post" action="/api/sesion">
        <Logo size={44} />
        <h1>Entrar al panel</h1>
        <label>
          Contraseña
          <input type="password" name="password" autoComplete="current-password" required autoFocus />
        </label>
        {error && <p className="login__error" role="alert">La contraseña no coincide. Vuelve a escribirla.</p>}
        <button type="submit">Entrar</button>
      </form>
    </main>
  );
}
